import { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

const COOKIE_PATH = path.join(process.cwd(), 'session.json');

export async function saveSession(page: Page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
  console.log('[인증] 세션 정보가 저장되었습니다:', COOKIE_PATH);
}

export async function loadSession(page: Page) {
  if (fs.existsSync(COOKIE_PATH)) {
    try {
      const cookiesString = fs.readFileSync(COOKIE_PATH, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      console.log('[인증] 기존 세션 정보를 불러왔습니다.');
      return true;
    } catch (err) {
      console.error('[인증] 세션 정보를 불러오는 중 오류 발생:', err);
      return false;
    }
  }
  console.log('[인증] 저장된 세션 정보가 없습니다.');
  return false;
}

export async function loginToInstagram(page: Page) {
  console.log('[인증] 로그인 상태를 확인 중입니다...');
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 로그인 여부 판단 (홈 피드 요소가 있는지 확인)
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('svg[aria-label="홈"], svg[aria-label="Home"], svg[aria-label="Search"]');
  });

  if (isLoggedIn) {
    console.log('[인증] 이미 로그인된 상태입니다.');
    // 기존 세션이 유효하더라도 최신 쿠키로 갱신
    await saveSession(page);
    return;
  }

  console.log('[인증] 로그인이 필요합니다. 인스타그램 로그인 페이지로 이동합니다...');
  if (!page.url().includes('accounts/login')) {
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  }
  
  console.log('[인증] 브라우저 창에서 직접 로그인을 진행해 주세요.');
  console.log('[인증] 로그인이 완료되고 메인 피드가 보일 때까지 대기합니다 (최대 5분)...');

  try {
    // 로그인이 완료되어 홈 피드 요소가 나타날 때까지 무한 대기 (또는 긴 시간)
    await page.waitForSelector('svg[aria-label="홈"], svg[aria-label="Home"], svg[aria-label="Search"]', { timeout: 300000 });
    console.log('[인증] 로그인 성공이 확인되었습니다.');
    
    // 로그인 직후 안정화를 위해 잠시 대기 후 세션 저장
    await new Promise(resolve => setTimeout(resolve, 5000));
    await saveSession(page);
  } catch (err) {
    console.error('[인증] 로그인 대기 시간이 초과되었습니다.');
    throw new Error('Login failed or timed out.');
  }
}
