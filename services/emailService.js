const imaps = require('imap-simple');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.connections = new Map(); // 缓存邮箱连接
  }

  /**
   * 获取邮箱连接配置
   */
  getImapConfig(emailConfig) {
    const config = {
      imap: {
        user: emailConfig.email,
        password: emailConfig.password,
        host: emailConfig.host,
        port: emailConfig.port,
        tls: emailConfig.secure,
        authTimeout: 3000,
        connTimeout: 60000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    // 预设配置
    if (emailConfig.provider === 'gmail') {
      config.imap.host = 'imap.gmail.com';
      config.imap.port = 993;
      config.imap.tls = true;
    } else if (emailConfig.provider === 'outlook') {
      config.imap.host = 'outlook.office365.com';
      config.imap.port = 993;
      config.imap.tls = true;
    }

    return config;
  }

  /**
   * 连接到邮箱
   */
  async connectToEmail(emailConfig) {
    try {
      const config = this.getImapConfig(emailConfig);
      const connection = await imaps.connect(config);
      return connection;
    } catch (error) {
      console.error('邮箱连接失败:', error);
      throw new Error(`邮箱连接失败: ${error.message}`);
    }
  }

  /**
   * 搜索Netflix验证码邮件
   */
  async searchNetflixEmails(connection, sinceDate) {
    try {
      await connection.openBox('INBOX');

      // 搜索条件：从Netflix发送的邮件，包含验证码关键词
      const searchCriteria = [
        'UNSEEN', // 未读邮件
        ['SINCE', sinceDate],
        ['OR',
          ['FROM', 'netflix.com'],
          ['FROM', 'noreply@netflix.com']
        ],
        ['OR',
          ['SUBJECT', 'verification'],
          ['SUBJECT', 'code'],
          ['SUBJECT', '验证'],
          ['SUBJECT', '验证码']
        ]
      ];

      const fetchOptions = {
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
        markSeen: false,
        struct: true
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      return messages;
    } catch (error) {
      console.error('搜索邮件失败:', error);
      throw new Error(`搜索邮件失败: ${error.message}`);
    }
  }

  /**
   * 获取邮件正文
   */
  async getEmailBody(connection, uid) {
    try {
      const messages = await connection.search([['UID', uid]], {
        bodies: ['TEXT', 'HTML'],
        markSeen: false
      });

      if (messages && messages.length > 0) {
        const parts = imaps.getParts(messages[0].attributes.struct);
        const textPart = parts.find(part => 
          part.disposition === null && part.encoding === 'quoted-printable'
        );

        if (textPart) {
          const body = await connection.getPartData(messages[0], textPart.partID);
          return body;
        }
      }
      return null;
    } catch (error) {
      console.error('获取邮件正文失败:', error);
      throw new Error(`获取邮件正文失败: ${error.message}`);
    }
  }

  /**
   * 从邮件内容中提取验证码
   */
  extractVerificationCode(emailBody) {
    if (!emailBody) return null;

    const codePatterns = [
      // 6位数字验证码
      /\b\d{6}\b/g,
      // 常见的验证码格式
      /verification code[:\s]*(\d{4,8})/gi,
      /verification[:\s]*(\d{4,8})/gi,
      /code[:\s]*(\d{4,8})/gi,
      // Netflix特定格式
      /your code is[:\s]*(\d{4,8})/gi,
      /enter this code[:\s]*(\d{4,8})/gi,
      // 中文格式
      /验证码[：:\s]*(\d{4,8})/gi,
      /代码[：:\s]*(\d{4,8})/gi
    ];

    for (const pattern of codePatterns) {
      const matches = emailBody.match(pattern);
      if (matches && matches.length > 0) {
        // 提取纯数字
        const codes = matches.map(match => {
          const numbers = match.match(/\d{4,8}/);
          return numbers ? numbers[0] : null;
        }).filter(Boolean);

        if (codes.length > 0) {
          // 返回最可能的验证码（通常是6位）
          const sixDigitCodes = codes.filter(code => code.length === 6);
          return sixDigitCodes.length > 0 ? sixDigitCodes[0] : codes[0];
        }
      }
    }

    return null;
  }

  /**
   * 获取Netflix验证码
   */
  async getNetflixVerificationCode(emailConfig, timeoutMinutes = 5) {
    if (!emailConfig || !emailConfig.auto_fetch_enabled || !emailConfig.email) {
      throw new Error('邮箱配置未启用或不完整');
    }

    let connection = null;
    try {
      connection = await this.connectToEmail(emailConfig);
      
      // 设置搜索起始时间（5分钟前）
      const sinceDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      
      // 轮询检查新邮件
      const maxAttempts = 30; // 最多尝试30次
      const intervalMs = 10000; // 每10秒检查一次

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const messages = await this.searchNetflixEmails(connection, sinceDate);
          
          if (messages && messages.length > 0) {
            // 按时间倒序排列，获取最新的邮件
            const sortedMessages = messages.sort((a, b) => 
              new Date(b.attributes.date) - new Date(a.attributes.date)
            );

            for (const message of sortedMessages) {
              const emailBody = await this.getEmailBody(connection, message.attributes.uid);
              const verificationCode = this.extractVerificationCode(emailBody);
              
              if (verificationCode) {
                // 标记邮件为已读
                await connection.addFlags(message.attributes.uid, '\\Seen');
                return {
                  code: verificationCode,
                  timestamp: new Date(),
                  source: 'email',
                  email: emailConfig.email
                };
              }
            }
          }

          // 如果不是最后一次尝试，等待一段时间
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }
        } catch (searchError) {
          console.error(`搜索尝试 ${attempt + 1} 失败:`, searchError);
          if (attempt === maxAttempts - 1) {
            throw searchError;
          }
        }
      }

      throw new Error('在指定时间内未找到验证码邮件');

    } catch (error) {
      console.error('获取验证码失败:', error);
      throw error;
    } finally {
      if (connection) {
        try {
          connection.end();
        } catch (closeError) {
          console.error('关闭邮箱连接失败:', closeError);
        }
      }
    }
  }

  /**
   * 测试邮箱连接
   */
  async testEmailConnection(emailConfig) {
    let connection = null;
    try {
      connection = await this.connectToEmail(emailConfig);
      await connection.openBox('INBOX');
      return { success: true, message: '邮箱连接成功' };
    } catch (error) {
      return { 
        success: false, 
        message: `邮箱连接失败: ${error.message}` 
      };
    } finally {
      if (connection) {
        try {
          connection.end();
        } catch (closeError) {
          console.error('关闭测试连接失败:', closeError);
        }
      }
    }
  }

  /**
   * 获取邮箱收件箱统计
   */
  async getInboxStats(emailConfig) {
    let connection = null;
    try {
      connection = await this.connectToEmail(emailConfig);
      const box = await connection.openBox('INBOX');
      
      return {
        total: box.messages.total,
        unread: box.messages.unseen,
        recent: box.messages.recent
      };
    } catch (error) {
      throw new Error(`获取邮箱统计失败: ${error.message}`);
    } finally {
      if (connection) {
        try {
          connection.end();
        } catch (closeError) {
          console.error('关闭连接失败:', closeError);
        }
      }
    }
  }
}

module.exports = new EmailService();
