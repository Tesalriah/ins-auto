import { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

const COOKIE_PATH = path.join(process.cwd(), 'session.json');

export async function saveSession(page: Page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
  console.log('Session saved to:', COOKIE_PATH);
}

export async function loadSession(page: Page) {
  if (fs.existsSync(COOKIE_PATH)) {
    const cookiesString = fs.readFileSync(COOKIE_PATH, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('Session loaded from:', COOKIE_PATH);
    return true;
  }
  console.log('No session found at:', COOKIE_PATH);
  return false;
}
