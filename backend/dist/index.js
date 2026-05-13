import { runEngine } from './engine.js';
async function main() {
    try {
        await runEngine();
        // 주기적 실행 설정 (예: 10분마다)
        setInterval(async () => {
            console.log('Running engine on schedule...');
            await runEngine();
        }, 10 * 60 * 1000);
    }
    catch (err) {
        console.error('Fatal error in main loop:', err);
    }
}
main();
