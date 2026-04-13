@echo off
cd /d D:\sajulotto
node --env-file=.env.local src\lib\cron\update-lotto.mjs
