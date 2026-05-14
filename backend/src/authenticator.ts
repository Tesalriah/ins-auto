import { Page } from 'puppeteer';

export async function loginToInstagram(page: Page) {
  console.log('[인증] 인스타그램 로그인 페이지로 이동합니다...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  
  console.log('[인증] 브라우저 창에서 직접 로그인을 진행해 주세요.');
  console.log('[인증] 로그인이 완료되고 메인 피드가 보일 때까지 대기합니다...');

  // 메인 피드의 특정 요소가 나타날 때까지 대기 (로그인 성공 여부 판단)
  try {
    // 검색 아이콘이나 홈 아이콘 등 로그인 후 나타나는 요소 대기
    await page.waitForSelector('svg[aria-label="홈"], svg[aria-label="Home"], svg[aria-label="Search"]', { timeout: 300000 }); // 5분 대기
    console.log('[인증] 로그인 성공이 확인되었습니다.');
  } catch (err) {
    console.error('[인증] 로그인 대기 시간이 초과되었거나 실패했습니다.');
    throw new Error('Login failed or timed out.');
  }
}
