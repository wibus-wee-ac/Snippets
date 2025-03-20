// ==UserScript==
// @name         长江雨课堂试题转JSON工具
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  将试题转换为JSON格式，可将 JSON 直接发送给 AI 回答问题，无需截图或更多复制
// @author       You
// @match        https://changjiang-exam.yuketang.cn/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==


(function() {
  'use strict';

  // 添加样式
  const styles = `
    .cj-json-btn {
      position: fixed;
      top: 15px;
      right: 15px;
      z-index: 9999;
      padding: 8px 15px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }
    
    .cj-json-btn:hover {
      background-color: #2980b9;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transform: translateY(-2px);
    }
    
    .cj-json-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
    }
    
    .cj-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .cj-modal {
      background-color: white;
      width: 80%;
      max-width: 800px;
      max-height: 80vh;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .cj-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }
    
    .cj-modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
    
    .cj-modal-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }
    
    .cj-modal-close:hover {
      background-color: #e9ecef;
      color: #333;
    }
    
    .cj-modal-body {
      padding: 20px;
      overflow-y: auto;
      flex-grow: 1;
    }
    
    .cj-textarea {
      width: 100%;
      height: 100%;
      min-height: 300px;
      padding: 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
    }
    
    .cj-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 15px 20px;
      background-color: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    
    .cj-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      margin-left: 10px;
    }
    
    .cj-btn-primary {
      background-color: #3498db;
      color: white;
    }
    
    .cj-btn-primary:hover {
      background-color: #2980b9;
    }
    
    .cj-btn-secondary {
      background-color: #e9ecef;
      color: #495057;
    }
    
    .cj-btn-secondary:hover {
      background-color: #dee2e6;
    }
    
    .cj-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #333;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10002;
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    }
    
    .cj-toast.show {
      opacity: 1;
    }
  `;
  
  // 添加样式到页面
  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(styles);
  } else {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  // 创建浮动按钮
  const button = document.createElement('button');
  button.textContent = '转换为JSON';
  button.className = 'cj-json-btn';
  document.body.appendChild(button);

  // 显示提示消息
  function showToast(message, duration = 3000) {
    // 移除现有的 toast
    const existingToast = document.querySelector('.cj-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'cj-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 触发重排以应用过渡效果
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  button.addEventListener('click', function() {
      // 获取所有题目
      const subjectItems = document.querySelectorAll('.subject-item');

      if (subjectItems.length === 0) {
          showToast('未找到试题内容！');
          return;
      }

      const questions = [];

      subjectItems.forEach((item, index) => {
          // 获取题目类型和分数
          const typeElement = item.querySelector('.item-type');
          const typeText = typeElement ? typeElement.textContent.trim() : '';
          const typeMatch = typeText.match(/(\d+)\.(\S+)\s*\((\d+)分\)/);

          const id = typeMatch ? parseInt(typeMatch[1]) : index + 1;
          const type = typeMatch ? typeMatch[2] : '';
          const score = typeMatch ? parseInt(typeMatch[3]) : 0;

          // 获取题目状态
          const statusElement = item.querySelector('.status');
          const status = statusElement ? '已提交' : '未提交';

          // 获取题目内容 - 修改此部分以适应新的HTML结构
          let questionText = '';
          const questionElement = item.querySelector('.item-body h4');
          if (questionElement) {
              // 优先查找 .custom_ueditor_cn_body，如果没有，则直接获取 h4 中的 p 标签内容
              const customBody = questionElement.querySelector('.custom_ueditor_cn_body');
              if (customBody) {
                  questionText = customBody.textContent.trim();
              } else {
                  const pElement = questionElement.querySelector('p');
                  if (pElement) {
                      questionText = pElement.textContent.trim();
                  } else {
                      // 如果上述都失败，直接获取 h4 的文本内容
                      questionText = questionElement.textContent.trim();
                  }
              }
          }

          // 获取选项 - 适配多种可能的HTML结构
          const options = [];
          
          // 处理单选题选项
          const radioOptionElements = item.querySelectorAll('.list-unstyled-radio li');
          radioOptionElements.forEach(optionElement => {
              const keyElement = optionElement.querySelector('.radioInput');
              let valueElement = optionElement.querySelector('.radioText .custom_ueditor_cn_body');
              
              // 如果没有找到 .custom_ueditor_cn_body，尝试直接从 .radioText 中获取 p 标签
              if (!valueElement) {
                  const radioText = optionElement.querySelector('.radioText');
                  if (radioText) {
                      const pElement = radioText.querySelector('p');
                      if (pElement) {
                          valueElement = pElement;
                      }
                  }
              }

              if (keyElement && valueElement) {
                  const key = keyElement.textContent.trim();
                  const value = valueElement.textContent.trim();
                  options.push({ key, value });
              }
          });
          
          // 处理多选题选项
          const checkboxOptionElements = item.querySelectorAll('.list-unstyled-checkbox li');
          checkboxOptionElements.forEach(optionElement => {
              const keyElement = optionElement.querySelector('.checkboxInput');
              let valueElement = optionElement.querySelector('.checkboxText .custom_ueditor_cn_body');
              
              // 如果没有找到 .custom_ueditor_cn_body，尝试直接从 .checkboxText 中获取 p 标签
              if (!valueElement) {
                  const checkboxText = optionElement.querySelector('.checkboxText');
                  if (checkboxText) {
                      const pElement = checkboxText.querySelector('p');
                      if (pElement) {
                          valueElement = pElement;
                      }
                  }
              }

              if (keyElement && valueElement) {
                  const key = keyElement.textContent.trim();
                  const value = valueElement.textContent.trim();
                  options.push({ key, value });
              }
          });
          
          // 判断题处理
          const judgementOptions = item.querySelectorAll('.list-inline.list-unstyled-radio li');
          if (judgementOptions.length === 2 && options.length === 0) {
              // 假设第一个是"是"，第二个是"否"
              options.push({ key: '✓', value: '正确' });
              options.push({ key: '✗', value: '错误' });
          }

          // 获取选中的选项
          let selected = null;
          
          // 单选题选中项
          const selectedRadioElement = item.querySelector('.el-radio.is-checked');
          if (selectedRadioElement) {
              const selectedKeyElement = selectedRadioElement.querySelector('.radioInput');
              if (selectedKeyElement) {
                  selected = selectedKeyElement.textContent.trim();
              }
          }
          
          // 多选题选中项
          const selectedCheckboxElements = item.querySelectorAll('.el-checkbox.is-checked');
          if (selectedCheckboxElements.length > 0) {
              selected = [];
              selectedCheckboxElements.forEach(element => {
                  const keyElement = element.querySelector('.checkboxInput');
                  if (keyElement) {
                      selected.push(keyElement.textContent.trim());
                  }
              });
          }

          questions.push({
              id,
              type,
              score,
              status,
              question: questionText,
              options,
              selected
          });
      });

      // 转换为JSON并复制到剪贴板
      const jsonString = JSON.stringify(questions, null, 2);

      try {
          // 创建模态框
          const modalOverlay = document.createElement('div');
          modalOverlay.className = 'cj-modal-overlay';
          
          const modal = document.createElement('div');
          modal.className = 'cj-modal';
          
          const modalHeader = document.createElement('div');
          modalHeader.className = 'cj-modal-header';
          
          const modalTitle = document.createElement('h3');
          modalTitle.className = 'cj-modal-title';
          modalTitle.textContent = '试题 JSON 数据';
          
          const closeButton = document.createElement('button');
          closeButton.className = 'cj-modal-close';
          closeButton.innerHTML = '&times;';
          closeButton.setAttribute('aria-label', '关闭');
          
          modalHeader.appendChild(modalTitle);
          modalHeader.appendChild(closeButton);
          
          const modalBody = document.createElement('div');
          modalBody.className = 'cj-modal-body';
          
          const textarea = document.createElement('textarea');
          textarea.className = 'cj-textarea';
          textarea.value = jsonString;
          textarea.readOnly = true;
          
          modalBody.appendChild(textarea);
          
          const modalFooter = document.createElement('div');
          modalFooter.className = 'cj-modal-footer';
          
          const copyButton = document.createElement('button');
          copyButton.className = 'cj-btn cj-btn-primary';
          copyButton.textContent = '复制到剪贴板';
          
          const closeBtn = document.createElement('button');
          closeBtn.className = 'cj-btn cj-btn-secondary';
          closeBtn.textContent = '关闭';
          
          modalFooter.appendChild(closeBtn);
          modalFooter.appendChild(copyButton);
          
          modal.appendChild(modalHeader);
          modal.appendChild(modalBody);
          modal.appendChild(modalFooter);
          
          modalOverlay.appendChild(modal);
          document.body.appendChild(modalOverlay);
          
          // 自动选中文本
          textarea.focus();
          textarea.select();
          
          // 关闭模态框的事件
          function closeModal() {
              document.body.removeChild(modalOverlay);
          }
          
          closeButton.addEventListener('click', closeModal);
          closeBtn.addEventListener('click', closeModal);
          modalOverlay.addEventListener('click', function(e) {
              if (e.target === modalOverlay) {
                  closeModal();
              }
          });
          
          // ESC 键关闭模态框
          document.addEventListener('keydown', function(e) {
              if (e.key === 'Escape' && document.body.contains(modalOverlay)) {
                  closeModal();
              }
          });
          
          // 复制按钮事件
          copyButton.addEventListener('click', function() {
              // 使用GM_setClipboard复制到剪贴板
              GM_setClipboard(jsonString);
              showToast('JSON已复制到剪贴板！');
              
              // 选中文本
              textarea.select();
          });
          
      } catch (e) {
          console.error('操作失败:', e);
          showToast('操作失败，请查看控制台输出。');
          console.log(jsonString);
      }
  });
})();