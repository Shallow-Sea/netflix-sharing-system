const axios = require('axios');

class EmailApiService {
  constructor() {
    this.activeRequests = new Map(); // 缓存正在进行的请求
  }

  /**
   * 构建API请求配置
   */
  buildRequestConfig(apiConfig) {
    const config = {
      method: apiConfig.api_method || 'GET',
      url: apiConfig.api_url,
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Netflix-Share-System/1.0',
        ...Object.fromEntries(apiConfig.api_headers || new Map())
      }
    };

    // 添加认证信息
    if (apiConfig.auth_token) {
      config.headers['Authorization'] = `Bearer ${apiConfig.auth_token}`;
    }
    if (apiConfig.api_key) {
      config.headers['X-API-Key'] = apiConfig.api_key;
    }

    // 添加请求参数
    const params = Object.fromEntries(apiConfig.api_params || new Map());
    if (config.method === 'GET') {
      config.params = params;
    } else {
      config.data = params;
    }

    return config;
  }

  /**
   * 从JSON响应中提取邮件数据
   */
  extractEmailsFromResponse(responseData, responseConfig) {
    try {
      // 使用配置的路径提取邮件列表
      const emailsPath = responseConfig.emails_path || 'data.emails';
      let emails = this.getNestedValue(responseData, emailsPath);

      if (!Array.isArray(emails)) {
        // 如果不是数组，尝试直接使用响应数据
        emails = Array.isArray(responseData) ? responseData : [responseData];
      }

      return emails.map(email => ({
        subject: this.getNestedValue(email, responseConfig.subject_field || 'subject') || '',
        content: this.getNestedValue(email, responseConfig.content_field || 'content') || '',
        from: this.getNestedValue(email, responseConfig.sender_field || 'from') || '',
        date: this.getNestedValue(email, responseConfig.date_field || 'date') || new Date().toISOString(),
        raw: email // 保留原始数据
      }));
    } catch (error) {
      console.error('解析邮件数据失败:', error);
      return [];
    }
  }

  /**
   * 获取嵌套对象的值
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return null;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 验证是否为Netflix邮件
   */
  isNetflixEmail(email) {
    const subject = (email.subject || '').toLowerCase();
    const from = (email.from || '').toLowerCase();
    const content = (email.content || '').toLowerCase();

    // Netflix发件人域名检查
    const netflixDomains = [
      'netflix.com',
      'noreply@netflix.com',
      'info@netflix.com',
      'help@netflix.com',
      '@account.netflix.com'
    ];

    const isFromNetflix = netflixDomains.some(domain => from.includes(domain));

    // Netflix相关关键词检查
    const netflixKeywords = [
      'netflix',
      'verification',
      'verify',
      'code',
      'security',
      'account',
      '验证',
      '验证码',
      '安全',
      '账户'
    ];

    const hasNetflixKeywords = netflixKeywords.some(keyword => 
      subject.includes(keyword) || content.includes(keyword)
    );

    // 验证码格式检查
    const hasVerificationCode = this.extractVerificationCodeFromEmail(email) !== null;

    return isFromNetflix || (hasNetflixKeywords && hasVerificationCode);
  }

  /**
   * 从邮件中提取验证码
   */
  extractVerificationCodeFromEmail(email) {
    const text = `${email.subject || ''} ${email.content || ''}`;
    
    const codePatterns = [
      // 6位数字验证码（最常见）
      /\b\d{6}\b/g,
      // 4-8位数字验证码
      /\b\d{4,8}\b/g,
      // 常见的验证码格式
      /verification code[:\s]*(\d{4,8})/gi,
      /verification[:\s]*(\d{4,8})/gi,
      /code[:\s]*(\d{4,8})/gi,
      /security code[:\s]*(\d{4,8})/gi,
      // Netflix特定格式
      /your code is[:\s]*(\d{4,8})/gi,
      /enter this code[:\s]*(\d{4,8})/gi,
      /use this code[:\s]*(\d{4,8})/gi,
      // 中文格式
      /验证码[：:\s]*(\d{4,8})/gi,
      /安全代码[：:\s]*(\d{4,8})/gi,
      /代码[：:\s]*(\d{4,8})/gi
    ];

    // 优先查找6位数字验证码
    const sixDigitMatch = text.match(/\b\d{6}\b/g);
    if (sixDigitMatch && sixDigitMatch.length > 0) {
      return sixDigitMatch[0];
    }

    // 查找其他格式的验证码
    for (const pattern of codePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // 提取纯数字
        const codes = matches.map(match => {
          const numbers = match.match(/\d{4,8}/);
          return numbers ? numbers[0] : null;
        }).filter(Boolean);

        if (codes.length > 0) {
          // 优先返回6位验证码，否则返回第一个
          const sixDigitCodes = codes.filter(code => code.length === 6);
          return sixDigitCodes.length > 0 ? sixDigitCodes[0] : codes[0];
        }
      }
    }

    return null;
  }

  /**
   * 通过API获取Netflix验证码
   */
  async getNetflixVerificationCode(apiConfig, timeoutMinutes = 5) {
    if (!apiConfig || !apiConfig.auto_fetch_enabled || !apiConfig.api_url) {
      throw new Error('邮箱API配置未启用或不完整');
    }

    const requestKey = `${apiConfig.api_url}_${Date.now()}`;
    
    try {
      // 防止重复请求
      if (this.activeRequests.has(apiConfig.api_url)) {
        throw new Error('该账号的验证码获取请求正在进行中，请稍后再试');
      }

      this.activeRequests.set(apiConfig.api_url, true);

      const requestConfig = this.buildRequestConfig(apiConfig);
      
      // 轮询检查邮件
      const maxAttempts = 30; // 最多尝试30次
      const intervalMs = 10000; // 每10秒检查一次
      const startTime = Date.now();

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          console.log(`尝试获取验证码邮件 (${attempt + 1}/${maxAttempts})`);
          
          const response = await axios(requestConfig);
          
          if (response.status === 200 && response.data) {
            const emails = this.extractEmailsFromResponse(response.data, apiConfig.response_config || {});
            
            // 筛选Netflix邮件
            const netflixEmails = emails.filter(email => this.isNetflixEmail(email));
            
            if (netflixEmails.length > 0) {
              // 按时间排序，获取最新的邮件
              const sortedEmails = netflixEmails.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
              );

              for (const email of sortedEmails) {
                const verificationCode = this.extractVerificationCodeFromEmail(email);
                
                if (verificationCode) {
                  console.log('成功获取Netflix验证码:', verificationCode);
                  return {
                    code: verificationCode,
                    timestamp: new Date(),
                    source: 'email_api',
                    email: apiConfig.email_address,
                    emailSubject: email.subject,
                    emailFrom: email.from
                  };
                }
              }
            }
          }

          // 检查是否超时
          if (Date.now() - startTime > timeoutMinutes * 60 * 1000) {
            throw new Error(`获取验证码超时 (${timeoutMinutes}分钟)`);
          }

          // 如果不是最后一次尝试，等待一段时间
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }

        } catch (requestError) {
          console.error(`API请求尝试 ${attempt + 1} 失败:`, requestError.message);
          
          if (requestError.code === 'ECONNABORTED' || requestError.code === 'ECONNREFUSED') {
            throw new Error(`API接口连接失败: ${requestError.message}`);
          }
          
          if (attempt === maxAttempts - 1) {
            throw requestError;
          }
        }
      }

      throw new Error('在指定时间内未找到Netflix验证码邮件');

    } catch (error) {
      console.error('获取验证码失败:', error);
      throw error;
    } finally {
      this.activeRequests.delete(apiConfig.api_url);
    }
  }

  /**
   * 测试API连接
   */
  async testApiConnection(apiConfig) {
    try {
      const requestConfig = this.buildRequestConfig(apiConfig);
      const response = await axios(requestConfig);
      
      if (response.status === 200) {
        const emails = this.extractEmailsFromResponse(response.data, apiConfig.response_config || {});
        return {
          success: true,
          message: 'API连接成功',
          emailCount: emails.length,
          sampleData: emails.slice(0, 2) // 返回前2封邮件作为示例
        };
      } else {
        return {
          success: false,
          message: `API返回状态码: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API连接失败: ${error.message}`
      };
    }
  }

  /**
   * 获取API状态统计
   */
  async getApiStats(apiConfig) {
    try {
      const requestConfig = this.buildRequestConfig(apiConfig);
      const response = await axios(requestConfig);
      
      if (response.status === 200) {
        const emails = this.extractEmailsFromResponse(response.data, apiConfig.response_config || {});
        const netflixEmails = emails.filter(email => this.isNetflixEmail(email));
        
        return {
          total: emails.length,
          netflix: netflixEmails.length,
          lastCheck: new Date(),
          api_url: apiConfig.api_url
        };
      }
      
      throw new Error(`API返回状态码: ${response.status}`);
    } catch (error) {
      throw new Error(`获取API统计失败: ${error.message}`);
    }
  }
}

module.exports = new EmailApiService();
