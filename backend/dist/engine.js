import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadSession, saveSession } from './authenticator.js';
import path from 'path';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// 사용자 데이터 폴더 경로 설정 (브라우저 환경 유지)
const USER_DATA_DIR = path.join(process.cwd(), 'user_data');
export async function runEngine() {
    console.log('--- 인스타그램 휴먼-시뮬레이션 엔진 가동 ---');
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: USER_DATA_DIR, // 브라우저 세션 및 환경 유지 (중요)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1280,1000',
            '--disable-notifications',
            '--lang=ko-KR' // 브라우저 언어 고정
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    // 실제 사용자처럼 보이기 위한 헤더 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    // 세션 로드
    const isLoggedIn = await loadSession(page);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    // 로그인 여부 재확인 (로그인 페이지로 리다이렉트 되는지 확인)
    if (page.url().includes('accounts/login')) {
        console.log('로그인이 필요합니다. 브라우저에서 로그인을 완료해 주세요.');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });
        await saveSession(page);
        console.log('로그인 정보가 저장되었습니다.');
    }
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
async function processTask(page, task) {
    try {
        await page.goto(task.post_url, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 댓글 버튼('답글 달기')들을 찾음
        const replyButtons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"]'));
            return btns
                .filter(b => b.textContent === '답글 달기' || b.textContent === 'Reply')
                .map((b, index) => ({ index, text: b.textContent }));
        });
        console.log(`페이지에서 ${replyButtons.length}개의 답글 버튼을 발견했습니다.`);
        // 실제 버튼 요소들을 다시 가져옴
        const rawButtons = await page.$$('div[role="button"]');
        const targetButtons = [];
        for (const b of rawButtons) {
            const txt = await page.evaluate(el => el.textContent, b);
            if (txt === '답글 달기' || txt === 'Reply')
                targetButtons.push(b);
        }
        for (const btn of targetButtons) {
            try {
                // 버튼이 속한 댓글 컨테이너에서 정보 추출
                const commentInfo = await page.evaluate((el) => {
                    const container = el.closest('li');
                    if (!container)
                        return null;
                    const user = container.querySelector('h2, h3, a, span[style*="font-weight: 600"]')?.textContent?.trim();
                    const msg = container.querySelector('span._a9zs')?.textContent?.trim();
                    return { user, msg };
                }, btn);
                if (!commentInfo || !commentInfo.user || commentInfo.user.length < 2)
                    continue;
                // 본인/답글 제외 로직
                if (commentInfo.msg?.includes(task.reply_content.slice(0, 3)))
                    continue;
                const commentId = commentInfo.user + (commentInfo.msg || '').slice(0, 15);
                const { data: existing } = await supabase.from('comments_history').select('*').eq('instagram_comment_id', commentId).single();
                if (!existing) {
                    console.log(`[타겟 발견] ${commentInfo.user}: ${commentInfo.msg?.slice(0, 15)}...`);
                    // 1. 답글 버튼 클릭
                    await btn.scrollIntoView();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await btn.click();
                    console.log('답글 버튼 클릭됨');
                    // 2. 입력창 활성화 대기 (태그가 자동으로 들어가는 시간)
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // 3. 입력창 찾기 및 포커스
                    const inputSelector = 'textarea[aria-label*="댓글"], textarea[aria-label*="Comment"]';
                    await page.waitForSelector(inputSelector);
                    await page.focus(inputSelector);
                    // 4. 태그 뒤에 내용 입력 (이미 @ID 가 입력되어 있으므로 ' ' 한칸 띄우고 입력)
                    await page.keyboard.type(' ' + task.reply_content, { delay: 150 });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // 5. '게시' 버튼 찾기 및 클릭
                    const postBtn = await page.evaluateHandle(() => {
                        const allBtns = Array.from(document.querySelectorAll('div[role="button"], button'));
                        return allBtns.find(b => b.textContent === '게시' || b.textContent === 'Post');
                    });
                    if (postBtn && postBtn.asElement()) {
                        await postBtn.click();
                        console.log('답글 게시 버튼 클릭 완료');
                    }
                    else {
                        await page.keyboard.press('Enter');
                        console.log('게시 버튼을 못 찾아 엔터로 대체');
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    // 6. DM 발송 (맞팔로우 체크 로직 포함)
                    await sendDMWithFollow(page, commentInfo.user, task.dm_content);
                    // 7. 다시 게시물 복귀
                    await page.goto(task.post_url, { waitUntil: 'networkidle2' });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    // 8. DB 기록
                    await supabase.from('comments_history').insert({
                        task_id: task.id,
                        instagram_comment_id: commentId,
                        username: commentInfo.user
                    });
                    console.log(`[성공] ${commentInfo.user}님 처리 완료`);
                }
            }
            catch (err) {
                console.log('개별 댓글 처리 중 오류(건너뜀):', err);
                continue;
            }
        }
        await supabase.from('tasks').update({ last_run_at: new Date() }).eq('id', task.id);
    }
    catch (err) {
        console.error('태스크 처리 중 심각한 오류:', err);
    }
}
async function sendDMWithFollow(page, username, message) {
    try {
        console.log(`${username}님 프로필로 이동...`);
        await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 4000));
        // 팔로우/맞팔로우 버튼 확인
        const followBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            return btns.find(b => ['팔로우', 'Follow', '맞팔로우', 'Follow Back'].includes(b.textContent || ''));
        });
        if (followBtn && followBtn.asElement()) {
            console.log('팔로우 버튼 발견, 클릭 중...');
            await followBtn.click();
            console.log('팔로우 후 대기 (12초)...');
            await new Promise(resolve => setTimeout(resolve, 12000));
        }
        // 메시지 버튼 찾기
        const messageBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            return btns.find(b => b.textContent === '메시지 보내기' || b.textContent === 'Message');
        });
        if (messageBtn && messageBtn.asElement()) {
            console.log('메시지 창으로 이동...');
            await messageBtn.click();
            // 메시지 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 6000));
            // 메시지 입력 및 전송
            await page.keyboard.type(message, { delay: 120 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.keyboard.press('Enter');
            console.log(`DM 발송 완료 -> ${username}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        else {
            console.log('메시지 버튼을 끝내 찾지 못했습니다. (제한된 계정일 수 있음)');
        }
    }
    catch (err) {
        console.error('DM 발송 중 오류:', err);
    }
}
