// @ts-check
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

// 定义文件路径
const filePath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'workspaceStorage'
);

/**
 * 获取 Cursor 的聊天历史记录
 * @returns {Promise<Array<{title: string, summary: string, messages: Array<{text: string, type: string}>>}
 */
async function getChatHistory(filePath: string, projectName: string) {
    // 连接到数据库
    const db = new Database(filePath, { readonly: true });

    try {
    // 获取所有表名
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    // 遍历每个表并打印内容
    const allCursorChats = tables.map((table: { name: string }) => {
        const rows = db.prepare(`SELECT * FROM ${table.name}`).all();

        const chatData = rows.filter((row: any) => row.key === "workbench.panel.aichat.view.aichat.chatdata");

        if (chatData.length > 0 && chatData[0] && chatData[0].value) {
            try {
                const value = chatData[0] ? chatData[0].value : null;
                if (value === null) {
                    return [];
                }
                let chatDataValue = JSON.parse(value).tabs;
                const allChats = chatDataValue.map((tab: any) => {
                    const title =  `# ${tab.chatTitle}` || '';
                    const summary = tab.summary ? `## ${tab.summary.text}` : '';
                    let currentChat = {
                        title,
                        summary,
                        messages: [],
                    };
                    const currentChatBubbles = tab.bubbles.map((bubble: any) => {
                        const avatar = bubble.type === 'user' ? '👤' : '🤖';
                        const textType = bubble.type === 'user' ? '*' : '**';
                        return {
                            text: `${avatar}: \n\n${textType}${bubble.text}${textType}`,
                            type: bubble.type,
                        };
                    });
                    currentChat.messages = currentChatBubbles;
                    // 创建文件夹
                    if (!fs.existsSync(`./${projectName}`)) {
                        fs.mkdirSync(`./${projectName}`);
                    }
                    fs.writeFileSync(`./${projectName}/${tab.chatTitle.length < 100 ? tab.chatTitle : "ChatTitle"}.json`, JSON.stringify(currentChat, null, 2));
                    return currentChat;
                }
            );

            return allChats;
            } catch (error) {
                console.error('解析聊天数据时发生错误:', error);
                return []; // 或者其他适当的错误处理
            }
        } else {
            console.log("No chat data found or invalid data structure, as chatData:", chatData);
                return []; // 或者其他适当的错误处理
            }
        });
    allCursorChats[0].forEach((chat: any) => {
        let chatContent = '';
        chatContent += chat.title + '\n';
        chatContent += chat.summary + '\n\n\n';
        chat.messages.forEach((message: any) => {
        chatContent += message.text + '\n\n';
        if (message.type === 'ai') {
            chatContent += '---' + '\n\n';
        }
        });
        if (!fs.existsSync(`./${projectName}`)) {
            fs.mkdirSync(`./${projectName}`);
        }
        fs.writeFileSync(`./${projectName}/${chat.title.replace('# ', '').split('||')[0].trim()}.md`, chatContent);
        console.log(chatContent);
    });
    return allCursorChats[0];
    } catch (error) {
    console.error('读取数据库时发生错误:', error);
    } finally {
    // 关闭数据库连接
    db.close();
    }
}

function getCursorDBPath() {
    fs.readdir(filePath, (err: any, files: any) => {
        if (err) {
            console.error('读取目录时发生错误:', err);
            return;
        }
        files.forEach((fileName: any) => {
            const currentFilePath = path.join(filePath, fileName);
            fs.readdir(currentFilePath, (err: any, files: any) => {
                if (err) {
                    console.error('读取目录时发生错误:', err);
                    return;
                }
                let projectName = '';
                let dbPath = '';
                files.forEach((file: any) => {
                    if (file == 'workspace.json') {
                        const workspaceJson = fs.readFileSync(path.join(currentFilePath, 'workspace.json'), 'utf8');
                        const workspaceJsonObj = JSON.parse(workspaceJson);
                        projectName = workspaceJsonObj.folder.split('/').pop();
                    }
                    if (file === 'state.vscdb') {
                        dbPath = path.join(currentFilePath, 'state.vscdb');
                    }
                });
                if (dbPath) {
                    getChatHistory(dbPath, projectName);
                }
            });
        });
    });
}

getCursorDBPath();
