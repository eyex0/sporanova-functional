@echo off
cd /d C:\Users\MontaserAbdalla\Downloads\sopranova-render
set NODE_ENV=development
node node_modules/tsx/dist/cli.mjs server/_core/index.ts
