import puppeteer, { Page, ElementHandle } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loginToInstagram, loadSession } from './authenticator.js';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function runEngine() {
  console.log('--- 인스타그램 휴먼-시뮬레이션 엔진 가동 ---');
  
  const browser = await puppeteer.launch({
    headless: false, 
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // 설치된 크롬 사용
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,1000',
      '--disable-notifications',
      '--lang=ko-KR'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

  // 세션 로드 시도
  await loadSession(page);

  // 로그인 수행 (세션이 유효하면 자동으로 넘어가고, 아니면 수동 로그인 대기)
  await loginToInstagram(page);

  const { data: tasks, error } = await supabase.from('tasks').select('*').eq('is_active', true);

  if (error || !tasks || tasks.length === 0) {
    console.log('활성화된 작업이 없습니다.');
    await browser.close();
    return;
  }

  for (const task of tasks) {
    console.log(`[시작] 게시물: ${task.post_url}`);
    await processTask(page, task);
  }

  console.log('--- 모든 프로세스 종료 ---');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}

async function processTask(page: Page, task: any) {
  try {
    // 1. 본인 프로필로 이동
    console.log(`[준비] 게시물을 찾기 위해 프로필로 이동합니다...`);
    
    // 로그인한 계정의 아이디를 자동으로 찾아서 이동
    const myUsername = await page.evaluate(() => {
      // 사이드바나 헤더의 프로필 링크에서 아이디 추출
      const profileLink = document.querySelector('a[href^="/"][role="link"] img[alt*="프로필 사진"]')?.closest('a') as HTMLAnchorElement;
      return profileLink?.href.split('/').filter(Boolean).pop();
    });

    if (myUsername) {
      console.log(`[준비] 계정(@${myUsername}) 프로필로 이동...`);
      await page.goto(`https://www.instagram.com/${myUsername}/`, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`[경고] 계정 아이디를 찾지 못했습니다. 메인 페이지에서 시도합니다.`);
      await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 게시물 URL에서 단축 코드(Shortcode) 추출 (예: CcXkMGkpTG9)
    const shortcode = task.post_url.split('/p/')[1]?.split('/')[0] || task.post_url.split('/reels/')[1]?.split('/')[0];
    
    console.log(`[탐색] 게시물(코드: ${shortcode})을 찾는 중...`);
    
    const postClicked = await page.evaluate((code) => {
      const links = Array.from(document.querySelectorAll('a'));
      const targetLink = links.find(a => a.href.includes(code));
      if (targetLink) {
        targetLink.scrollIntoView();
        targetLink.click();
        return true;
      }
      return false;
    }, shortcode);

    if (!postClicked) {
      console.log(`[경고] 프로필에서 게시물을 찾지 못했습니다. 직접 이동으로 대체합니다.`);
      await page.goto(task.post_url, { waitUntil: 'domcontentloaded' });
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 스크롤을 살짝 내려서 댓글 로딩 유도
    await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      if (modal) modal.scrollBy(0, 500);
      else window.scrollBy(0, 500);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 1. 처리해야 할 댓글 대상 정보 수집 (가장 범용적인 방식으로 회귀)
    const targets = await page.evaluate(() => {
      const results: any[] = [];
      const allPossible = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const replyElements = allPossible.filter(el => {
        const t = el.textContent?.trim();
        return t === '답글 달기' || t === 'Reply' || t === '답글';
      });

      for (const el of replyElements) {
        let container = el.parentElement;
        let user = '';
        let msg = '';

        for (let i = 0; i < 8; i++) {
          if (!container) break;
          
          // 유저네임 추출 시 '분', '시간', '주', '일' 등이 포함된 링크는 제외 (시간 정보임)
          const links = Array.from(container.querySelectorAll('h3 a, h2 a, a[href*="/"]'));
          const userLink = links.find(a => {
            const t = a.textContent?.trim() || '';
            return t.length >= 2 && 
                   !t.includes('분') && 
                   !t.includes('시간') && 
                   !t.includes('주') && 
                   !t.includes('일') && 
                   !['답글 달기', 'Reply', '좋아요'].includes(t);
          });

          if (userLink && userLink.textContent?.trim()) {
            user = userLink.textContent.trim();
            const msgEl = container.querySelector('span._ap3a, span._a9zs, div[dir="auto"]');
            msg = msgEl?.textContent?.trim() || '';
            break;
          }
          container = container.parentElement;
        }

        if (user && !results.find(r => r.user === user)) {
          results.push({ user, msg });
        }
      }
      return results;
    });

    console.log(`[분석] 최종적으로 ${targets.length}명의 댓글 작성자를 발견했습니다.`);

    for (const target of targets) {
      try {
        const commentId = target.user + (target.msg || '').slice(0, 15);
        const { data: existing } = await supabase.from('comments_history').select('*').eq('instagram_comment_id', commentId).single();

        if (existing) {
          console.log(`[스킵] 이미 처리된 댓글: ${target.user}`);
          continue;
        }

        console.log(`[진행] ${target.user}님의 댓글 처리 시작...`);

        // 2. 해당 유저의 답글 버튼을 '매번 새로' 찾아서 클릭 (검색 로직과 동일하게 맞춤)
        const clicked = await page.evaluate((username) => {
          const allPossible = Array.from(document.querySelectorAll('button, div[role="button"], span'));
          const replyElements = allPossible.filter(el => {
            const t = el.textContent?.trim();
            return t === '답글 달기' || t === 'Reply' || t === '답글';
          });

          for (const el of replyElements) {
            let container = el.parentElement;
            for (let i = 0; i < 8; i++) {
              if (!container) break;
              const userLink = container.querySelector('h3 a, h2 a, a[href*="/"]');
              if (userLink && userLink.textContent?.trim() === username) {
                const btn = el.closest('button, div[role="button"]') as HTMLElement || el as HTMLElement;
                if (btn) {
                  btn.scrollIntoView();
                  btn.click();
                  return true;
                }
              }
              container = container.parentElement;
            }
          }
          return false;
        }, target.user);

        if (!clicked) {
          console.log(`[경고] ${target.user}님의 답글 버튼을 찾지 못했습니다.`);
          continue;
        }

        console.log(`[단계 1/4] 답글 버튼 클릭 성공 (@${target.user})`);
        // 답글 버튼 클릭 후 태그(@id)가 입력될 때까지 대기
        await new Promise(resolve => setTimeout(resolve, 800));

        // 3. 답글 입력 및 게시
        const inputSelector = 'textarea[aria-label*="댓글"], textarea[placeholder*="댓글"], section textarea';
        await page.waitForSelector(inputSelector, { timeout: 5000 });
        await page.focus(inputSelector);
        
        await page.keyboard.type(task.reply_content, { delay: 30 });
        await new Promise(resolve => setTimeout(resolve, 500));

        const posted = await page.evaluate(() => {
          // '게시' 텍스트를 가진 span을 먼저 찾음
          const spans = Array.from(document.querySelectorAll('span'));
          const postSpan = spans.find(s => s.textContent?.trim() === '게시' || s.textContent?.trim() === 'Post');
          
          if (postSpan) {
            const btn = postSpan.closest('div[role="button"], button') as HTMLElement;
            if (btn) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!posted) {
          await page.keyboard.press('Enter');
          console.log(`[단계 2/4] 게시 버튼 못 찾아 Enter 키로 대체`);
        } else {
          console.log(`[단계 2/4] 답글 게시 완료`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. 새 탭을 열어 DM 발송 (게시물 페이지 유지)
        console.log(`[단계 3/4] DM 발송 시작 (새 탭)...`);
        await sendDMInNewTab(page.browser(), target.user, task.dm_content);
        console.log(`[단계 4/4] DM 작업 종료`);

        // 5. DB 기록
        await supabase.from('comments_history').insert({
          task_id: task.id,
          instagram_comment_id: commentId,
          username: target.user
        });
        console.log(`[완료] ${target.user}님 처리 성공`);

        // 다음 댓글 처리 전 랜덤 대기 (초고속)
        const delay = Math.floor(Math.random() * 500) + 300;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err) {
        console.error(`[오류] ${target.user}님 처리 중 문제 발생:`, err);
      }
    }
    
    await supabase.from('tasks').update({ last_run_at: new Date() }).eq('id', task.id);
  } catch (err) {
    console.error('태스크 처리 중 심각한 오류:', err);
  }
}

async function sendDMInNewTab(browser: any, username: string, message: string) {
  const dmPage = await browser.newPage();
  try {
    console.log(`   - [DM] ${username}님 프로필로 이동...`);
    await dmPage.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. 헤더 내 버튼 상태 확인
    const buttonState = await dmPage.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return { canMessage: false, canFollow: false };

      const btns = Array.from(header.querySelectorAll('button, div[role="button"]'));
      
      const hasMessageBtn = btns.some(b => b.textContent === '메시지 보내기' || b.textContent === 'Message');
      const followBtn = btns.find(b => 
        ['팔로우', 'Follow', '맞팔로우', 'Follow Back'].includes(b.textContent || '')
      ) as HTMLElement;

      if (hasMessageBtn) {
        return { canMessage: true, canFollow: false };
      } else if (followBtn) {
        followBtn.click();
        return { canMessage: false, canFollow: true, followBtnText: followBtn.textContent };
      }
      return { canMessage: false, canFollow: false };
    });

    if (buttonState.canFollow) {
      console.log(`   - [DM] ${buttonState.followBtnText} 버튼 클릭됨. 3초 대기...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 2. 메시지 버튼 클릭 (이미 있거나 팔로우 후에 생겼을 경우)
    const msgBtnClicked = await dmPage.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      
      const btns = Array.from(header.querySelectorAll('button, div[role="button"]'));
      const target = btns.find(b => b.textContent === '메시지 보내기' || b.textContent === 'Message') as HTMLElement;
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    if (msgBtnClicked) {
      console.log(`   - [DM] 메시지 창 로딩 대기...`);
      await new Promise(resolve => setTimeout(resolve, 3500));

      const inputSelector = 'div[role="textbox"], textarea[aria-label*="메시지"], textarea[placeholder*="메시지"]';
      try {
        await dmPage.waitForSelector(inputSelector, { timeout: 10000 });
        await dmPage.focus(inputSelector);
        console.log(`   - [DM] 메시지 입력 중...`);
        await dmPage.keyboard.type(message, { delay: 60 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        await dmPage.keyboard.press('Enter');
        
        await dmPage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const sendBtn = btns.find(b => b.textContent === '보내기' || b.textContent === 'Send') as HTMLElement;
          if (sendBtn) sendBtn.click();
        });

        console.log(`   - [DM] 메시지 전송 시도 완료`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.log(`   - [DM] 메시지 입력창을 찾지 못했거나 입력에 실패했습니다.`);
      }
    } else {
      console.log(`   - [DM] 메시지 버튼을 찾지 못했습니다.`);
    }
  } catch (err) {
    console.error('   - [DM] 오류 발생:', err);
  } finally {
    await dmPage.close();
  }
}


