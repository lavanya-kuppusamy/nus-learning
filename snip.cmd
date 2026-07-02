@echo off
:: snip.cmd — Windows CMD wrapper; forwards all arguments to cli.js
node "%~dp0cli.js" %*
