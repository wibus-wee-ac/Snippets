// ==UserScript==
// @name         课程评价自动填写
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动填写期末评价表单
// @author       wibus-wee
// @match        https://gdlgxy.mycospxk.com/index.html*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 美化的控制台输出样式
    const styles = {
        header: 'background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 14px;',
        success: 'background: #52c41a; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
        info: 'background: #1890ff; color: white; padding: 4px 8px; border-radius: 4px;',
        warning: 'background: #faad14; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
        error: 'background: #ff4d4f; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
        process: 'background: #722ed1; color: white; padding: 4px 8px; border-radius: 4px;',
        debug: 'background: #13c2c2; color: white; padding: 4px 8px; border-radius: 4px;'
    };

    // 美化的日志函数
    const logger = {
        header: (msg) => console.log(`%c🎓 ${msg}`, styles.header),
        success: (msg) => console.log(`%c✅ ${msg}`, styles.success),
        info: (msg) => console.log(`%c📝 ${msg}`, styles.info),
        warning: (msg) => console.log(`%c⚠️ ${msg}`, styles.warning),
        error: (msg) => console.log(`%c❌ ${msg}`, styles.error),
        process: (msg) => console.log(`%c⚙️ ${msg}`, styles.process),
        debug: (msg) => console.log(`%c🔍 ${msg}`, styles.debug)
    };

    logger.header('课程评价自动填写脚本. Author: @wibus-wee');

    // 创建进度条
    function createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.id = 'auto-fill-progress';
        progressContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            min-width: 320px;
            display: none;
        `;

        const title = document.createElement('div');
        title.innerHTML = '🎓 自动填写进度';
        title.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 16px;
            text-align: center;
        `;

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 12px;
        `;

        const progressFill = document.createElement('div');
        progressFill.id = 'progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: 0%;
            transition: width 0.3s ease;
        `;

        const statusText = document.createElement('div');
        statusText.id = 'status-text';
        statusText.style.cssText = `
            font-size: 14px;
            color: #666;
            text-align: center;
        `;

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(title);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(statusText);
        document.body.appendChild(progressContainer);

        return {
            container: progressContainer,
            fill: progressFill,
            status: statusText
        };
    }

    // 更新进度
    function updateProgress(percentage, status) {
        const progressElements = window.autoFillProgress;
        if (progressElements) {
            progressElements.fill.style.width = `${percentage}%`;
            progressElements.status.textContent = status;
        }
    }

    // 显示/隐藏进度条
    function showProgress() {
        if (!window.autoFillProgress) {
            window.autoFillProgress = createProgressBar();
        }
        window.autoFillProgress.container.style.display = 'block';
    }

    function hideProgress() {
        if (window.autoFillProgress) {
            window.autoFillProgress.container.style.display = 'none';
        }
    }

    // 创建通知
    function showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            padding: 16px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            animation: slideDown 0.3s ease;
            max-width: 400px;
            text-align: center;
        `;

        // 根据类型设置样式
        const styles = {
            success: 'background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);',
            error: 'background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);',
            warning: 'background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);',
            info: 'background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);'
        };

        notification.style.cssText += styles[type] || styles.success;
        notification.innerHTML = message;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes slideUp {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // 等待页面加载完成
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            checkElement();
        });
    }

    // 延迟函数
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 经过实际测试验证的自动填写方法
    async function autoFillGDLGEvaluation() {
        try {
            logger.process('开始自动填写评价表单...');
            updateProgress(10, '正在加载评价表单...');

            // 等待评价表单加载
            await waitForElement('input[type="radio"]');
            await delay(2000);

            // 直接查找所有"优秀"选项并点击
            const excellentRadios = document.querySelectorAll('input[type="radio"]');
            logger.info(`页面总共找到 ${excellentRadios.length} 个单选按钮`);

            const totalGroups = Math.floor(excellentRadios.length / 5);
            updateProgress(20, `发现 ${totalGroups} 个评价项目`);

            let processedCount = 0;

            // 遍历所有单选按钮，按组处理
            for (let i = 0; i < excellentRadios.length; i += 5) {
                // 每5个单选按钮为一组（优秀、良好、中等、合格、不合格）
                const radioGroup = Array.from(excellentRadios).slice(i, i + 5);
                if (radioGroup.length < 5) continue;

                const currentGroup = Math.floor(i / 5) + 1;
                const progress = 20 + (currentGroup / totalGroups) * 60; // 20-80%

                // 查找该组的问题文本
                const firstRadio = radioGroup[0];
                const questionContainer = firstRadio.closest('div');
                let questionText = '';

                if (questionContainer) {
                    const paragraphs = questionContainer.querySelectorAll('p');
                    for (const p of paragraphs) {
                        if (p.textContent.includes('【') && p.textContent.includes('】')) {
                            questionText = p.textContent.trim();
                            break;
                        }
                    }
                }

                const shortText = questionText.substring(0, 30) + (questionText.length > 30 ? '...' : '');
                updateProgress(progress, `处理第 ${currentGroup}/${totalGroups} 项: ${shortText}`);
                logger.process(`处理评价项目 ${currentGroup}: ${questionText.substring(0, 50)}${questionText.length > 50 ? '...' : ''}`);

                // 根据问题内容决定选择哪个选项
                let targetIndex = 0; // 默认选择第一个（优秀）

                // 特殊处理：对课程内容、学习方法、要求以及成绩评定有相关介绍 - 选择良好
                if (currentGroup === 5) {
                    targetIndex = 1; // 选择第二个（良好）
                    logger.warning('检测到特殊题目，将选择"良好"');
                }

                // 点击对应的选项
                if (radioGroup[targetIndex]) {
                    const targetRadio = radioGroup[targetIndex];
                    const optionText = targetRadio.parentElement ? targetRadio.parentElement.textContent.trim() : '未知';
                    logger.success(`选择: ${optionText}`);
                    targetRadio.click();
                    processedCount++;
                    await delay(300);
                }
            }

            updateProgress(80, '评价项目填写完成，准备选择标签...');
            logger.success(`✨ 处理了 ${processedCount} 个评价项目`);
            return true;
        } catch (error) {
            logger.error(`自动填写失败: ${error.message}`);
            return false;
        }
    }

    // 主要的自动填写函数
    async function autoFillEvaluation() {
        try {
            logger.header('🚀 开始自动填写评价表单...');
            showProgress();
            updateProgress(0, '初始化中...');

            // 调用经过测试验证的填写方法
            const success = await autoFillGDLGEvaluation();
            if (!success) {
                logger.error('自动填写失败');
                hideProgress();
                return;
            }

            // 处理标签选择
            await autoSelectTags();

            updateProgress(100, '🎉 自动填写完成！');
            logger.success('🎉 自动填写完成！请检查后手动提交。');

            // 显示完成通知
            showNotification('🎉 自动填写完成！请检查后手动提交', 'success', 5000);

            // 3秒后隐藏进度条
            setTimeout(() => {
                hideProgress();
            }, 3000);
        } catch (error) {
            logger.error(`自动填写过程中出现错误: ${error.message}`);
            hideProgress();
            showNotification(`❌ 自动填写失败: ${error.message}`, 'error', 5000);
        }
    }

    // 自动选择标签
    async function autoSelectTags() {
        logger.process('🏷️ 开始选择整体评价标签...');
        updateProgress(85, '正在选择评价标签...');
        await delay(1000);

        const positiveTagsToClick = [
            '教书育人',
            '理论联系实际',
            '有挑战性',
            '融入前沿知识',
            '教学方法多样',
            '师生互动良好',
            '受益匪浅'
        ];

        let clickedCount = 0;

        // 直接查找标签元素
        for (const tagText of positiveTagsToClick) {
            if (clickedCount >= 7) break;

            const tagElements = document.querySelectorAll('*');
            for (const elem of tagElements) {
                if (elem.textContent.trim() === tagText &&
                    elem.children.length === 0) { // 确保是叶子节点
                    logger.success(`点击标签: ${tagText}`);
                    elem.click();
                    clickedCount++;

                    // 更新进度
                    const tagProgress = 85 + (clickedCount / 7) * 10; // 85-95%
                    updateProgress(tagProgress, `已选择 ${clickedCount}/7 个标签`);

                    await delay(300);
                    break;
                }
            }
        }

        updateProgress(95, `标签选择完成 (${clickedCount}/7)`);
        logger.info(`📊 已选择 ${clickedCount} 个标签`);
    }


    // 添加控制按钮
    function addControlButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        const fillButton = document.createElement('button');
        fillButton.innerHTML = '🎓 自动填写评价';
        fillButton.style.cssText = `
            padding: 12px 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        `;
        fillButton.addEventListener('mouseover', () => {
            fillButton.style.transform = 'translateY(-2px)';
            fillButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });
        fillButton.addEventListener('mouseout', () => {
            fillButton.style.transform = 'translateY(0)';
            fillButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });
        fillButton.addEventListener('click', () => {
            showNotification('🚀 开始自动填写评价表单...', 'info', 2000);
            autoFillEvaluation();
        });

        buttonContainer.appendChild(fillButton);
        document.body.appendChild(buttonContainer);
    }

    addControlButton();
    showNotification('🎓 课程评价自动填写脚本已就绪', 'info', 3000);

})();
