// ==UserScript==
// @name         问卷星自动填写（正式版）
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  问卷星自动填写脚本，支持单选和多选，支持验证码弹窗（也许）支持一次性批量刷题
// @author       Wenjuanxing
// @match        https://www.wjx.cn/vm/*
// @match        https://www.wjx.cn/wjx/join/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 添加调试面板
  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = `
        position: fixed;
        top: 50px;
        right: 10px;
        width: 300px;
        height: 200px;
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 10px;
        overflow: auto;
        z-index: 9999;
        font-size: 12px;
    `;
  document.body.appendChild(debugPanel);

  function log(message) {
    const logLine = document.createElement('div');
    logLine.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    debugPanel.appendChild(logLine);
    debugPanel.scrollTop = debugPanel.scrollHeight;
    console.log(message);
  }

  const button = document.createElement('button');
  button.innerHTML = '自动填写';
  button.style.position = 'fixed';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  document.body.appendChild(button);

  // 添加输入框和计数显示
  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 100px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.value = '1';
  input.style.width = '60px';
  
  const countDisplay = document.createElement('span');
  countDisplay.style.color = '#fff';
  countDisplay.style.background = 'rgba(0,0,0,0.8)';
  countDisplay.style.padding = '5px';
  
  controlPanel.appendChild(input);
  controlPanel.appendChild(countDisplay);
  document.body.appendChild(controlPanel);

  // 修改 button 点击事件
  button.addEventListener('click', function () {
    const totalCount = parseInt(input.value);
    if (totalCount < 1) return;
    
    // 存储总次数和当前进度
    localStorage.setItem('wjx_total_count', totalCount);
    localStorage.setItem('wjx_current_count', '1');
    localStorage.setItem('wjx_original_url', window.location.href);
    
    log(`开始自动填写，计划执行 ${totalCount} 次`);
    updateCountDisplay(1, totalCount);
    autoFill();
  });

  // 添加计数显示更新函数
  function updateCountDisplay(current, total) {
    countDisplay.textContent = `${current}/${total}`;
  }

  // 检查是否需要继续执行
  function checkAndContinue() {
    const totalCount = parseInt(localStorage.getItem('wjx_total_count'));
    const currentCount = parseInt(localStorage.getItem('wjx_current_count'));
    const originalUrl = localStorage.getItem('wjx_original_url');
    
    if (totalCount && currentCount && originalUrl) {
      if (currentCount < totalCount) {
        // 更新计数
        const newCount = currentCount + 1;
        localStorage.setItem('wjx_current_count', newCount);
        updateCountDisplay(newCount, totalCount);
        
        // 跳转回原始问卷页面
        window.location.href = originalUrl;
      } else {
        // 完成所有次数，清除存储
        localStorage.removeItem('wjx_total_count');
        localStorage.removeItem('wjx_current_count');
        localStorage.removeItem('wjx_original_url');
        log('所有填写任务已完成！');
      }
    }
  }

  // 在页面加载时检查是否需要继续执行
  window.addEventListener('load', function() {
    const totalCount = parseInt(localStorage.getItem('wjx_total_count'));
    const currentCount = parseInt(localStorage.getItem('wjx_current_count'));
    
    if (totalCount && currentCount) {
      updateCountDisplay(currentCount, totalCount);
      
      // 如果在提交成功页面，则继续下一次
      if (window.location.href.includes('completemobile2.aspx')) {
        checkAndContinue();
      } else {
        // 如果在问卷页面，自动开始填写
        log(`继续执行第 ${currentCount} 次填写`);
        autoFill();
      }
    }
  });

  function autoFill() {
    const questions = document.querySelectorAll('.field.ui-field-contain');
    log(`找到 ${questions.length} 个问题`);

    questions.forEach((question, index) => {
      log(`处理第 ${index + 1} 个问题`);
      const type = question.getAttribute('type');
      log(`问题类型: ${type}`);

      if (type === "3") {  // 单选题
        const options = question.querySelectorAll('div.ui-radio');
        if (options.length > 0) {
          log(`发现单选题，有 ${options.length} 个选项`);
          // 剔除包含"其他"的选项
          const validOptions = Array.from(options).filter(option => {
            const labelText = option.querySelector('.label')?.textContent || '';
            return !labelText.includes('其他');
          });
          const randomIndex = Math.floor(Math.random() * validOptions.length);
          try {
            const input = validOptions[randomIndex];
            if (input) {
              input.click();
              log(`成功点击第 ${randomIndex + 1} 个选项`);
            }
          } catch (e) {
            log(`点击失败: ${e.message}`);
          }
        }
      } else if (type === "4") {  // 多选题
        const options = question.querySelectorAll('.ui-checkbox');
        if (options.length > 0) {
          log(`发现多选题，有 ${options.length} 个选项`);

          // 过滤掉包含"其他"的选项
          const validOptions = Array.from(options).filter(option => {
            const labelText = option.querySelector('.label')?.textContent || '';
            return !labelText.includes('其他');
          });

          log(`有效选项数量: ${validOptions.length}`);

          // 随机选择1-3个选项
          const numToSelect = Math.floor(Math.random() * 3) + 1;
          log(`随机选择 ${numToSelect} 个选项`);

          // 打乱数组顺序
          const shuffled = validOptions.sort(() => 0.5 - Math.random());

          // 选择指定数量的选项
          for (let i = 0; i < Math.min(numToSelect, shuffled.length); i++) {
            try {
              const jqcheck = shuffled[i].querySelector('.jqcheck');
              if (jqcheck) {
                jqcheck.click();
                log(`成功点击第 ${i + 1} 个选项`);
              }
            } catch (e) {
              log(`点击失败: ${e.message}`);
            }
          }
        }
      }
    });

    // 提交按钮处理
    setTimeout(() => {
      // 滚动到最下面
      window.scrollTo(0, document.body.scrollHeight);
      log('尝试查找提交按钮');
      const submitButton = document.querySelector('#ctlNext');
      if (submitButton) {
        log('找到提交按钮，点击提交');
        submitButton.click();

        // 处理验证码弹窗
        setTimeout(() => {
          // 处理弹窗的确认按钮
          const confirmButton = document.querySelector('.layui-layer-btn0');
          if (confirmButton) {
            log('找到验证弹窗确认按钮，点击确认');
            confirmButton.click();

            // 等待验证按钮出现并点击
            setTimeout(() => {
              const verifyButton = document.querySelector('#SM_BTN_1');
              if (verifyButton) {
                log('找到智能验证按钮，点击验证');
                verifyButton.click();
              } else {
                log('未找到智能验证按钮');
              }
            }, 500);
          } else {
            log('未找到验证弹窗确认按钮');
          }
        }, 500);
      } else {
        log('未找到提交按钮，尝试其他方法');
        // 备用方案：通过类名查找
        const altSubmitButton = document.querySelector('.submitbtn');
        if (altSubmitButton) {
          log('通过类名找到提交按钮');
          altSubmitButton.click();
        } else {
          // 再次备用：通过文本内容查找
          const buttons = document.querySelectorAll('div');
          for (let button of buttons) {
            if (button.textContent.trim() === '提交') {
              log('通过文本内容找到提交按钮');
              button.click();
              return;
            }
          }
          log('所有方法都未找到提交按钮');
        }
      }
    }, 1000);
  }
})();