import dotenv from 'dotenv';
dotenv.config();

// Model configurations - Only Groq and OpenRouter are active
const MODEL_CONFIGS = {
  // ==================== GROQ MODEL (NORMAL TIER - ACTIVE) ====================
  'Quantara AI-basic-groq': {
    provider: 'groq',
    name: 'Quantara AI Basic',
    description: 'Fast responses for everyday tasks. Powered by Hydra 3.2 8B.',
    maxTokens: 800,
    temp: 0.7,
    tier: 'normal',
    actualModel: 'llama-3.1-8b-instant',
    isActive: true
  },

  // ==================== OPENROUTER MODEL (MEDIUM TIER - ACTIVE) ====================
  'Quantara AI-pro': {
    provider: 'openrouter',
    name: 'Quantara AI Pro',
    description: 'Balanced speed and intelligence. Powered by Hydra 3.0 8B.',
    maxTokens: 1500,
    temp: 0.7,
    tier: 'medium',
    actualModel: 'meta-llama/llama-3.1-8b-instruct:free',
    isActive: true
  },

  // ==================== COMING SOON MODELS (INACTIVE) ====================
  'Quantara AI-advanced': {
    provider: 'none',
    name: 'Quantara AI Advanced',
    description: 'Coming Soon! Complex reasoning and high accuracy.',
    maxTokens: 2000,
    temp: 0.7,
    tier: 'high',
    isActive: false,
    comingSoon: true
  },
  
  'Quantara AI-enterprise': {
    provider: 'none',
    name: 'Quantara AI Enterprise',
    description: 'Coming Soon! Most powerful model for enterprise tasks.',
    maxTokens: 4000,
    temp: 0.7,
    tier: 'enterprise',
    isActive: false,
    comingSoon: true
  },
  
  'Quantara AI-uncensored': {
    provider: 'none',
    name: 'Quantara AI Uncensored',
    description: 'Coming Soon! Unfiltered responses. Use with caution.',
    maxTokens: 2000,
    temp: 0.8,
    tier: 'uncensored',
    isActive: false,
    comingSoon: true
  },

  // Legacy model mappings (for backward compatibility)
  'Quantara AI-basic': {
    provider: 'groq',
    name: 'Quantara AI Basic',
    description: 'Fast responses for everyday tasks',
    maxTokens: 800,
    temp: 0.7,
    tier: 'normal',
    actualModel: 'llama-3.1-8b-instant',
    isActive: true
  },
};

export async function callAIStream(messages, model, onChunk, customKeys = {}) {
  console.log('📡 Calling AI with model:', model);
  
  // Get model configuration
  let modelConfig = MODEL_CONFIGS[model];
  
  if (!modelConfig) {
    console.log('❌ Model configuration not found:', model);
    return callComingSoonStream(messages, model, onChunk);
  }
  
  // Check if model is active
  if (!modelConfig.isActive) {
    console.log('🚀 Model is coming soon:', model);
    return callComingSoonStream(messages, modelConfig.name || model, onChunk);
  }
  
  const actualModelId = modelConfig.actualModel || model;
  const provider = modelConfig.provider;
  
  console.log(`🤖 Using ${modelConfig.name} (${provider}) - Model: ${actualModelId}`);
  
  // Route to appropriate provider
  if (provider === 'groq') {
    const apiKey = customKeys?.groqKey || process.env.GROQ_API_KEY;
    if (apiKey) {
      return callGroqStream(messages, actualModelId, onChunk, apiKey, modelConfig);
    }
    return callMockStream(messages, model, onChunk, 'Hydra API key missing. Add GROQ_API_KEY to .env');
  }
  
  if (provider === 'openrouter') {
    const apiKey = customKeys?.openRouterKey || process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      return callOpenRouterStream(messages, actualModelId, onChunk, apiKey, modelConfig);
    }
    return callMockStream(messages, model, onChunk, 'Hydra API key missing. Add Hydra to .env');
  }
  
  return callMockStream(messages, model, onChunk, 'No valid provider');
}

// 🚀 COMING SOON STREAM
async function callComingSoonStream(messages, modelName, onChunk) {
  const displayName = typeof modelName === 'string' && modelName.includes('Quantara AI') 
    ? modelName 
    : 'Quantara AI Advanced';
  
  const reply = `🚀 **${displayName} - Coming Soon!**\n\n`;
  const reply2 = `Thank you for your interest in ${displayName}!\n\n`;
  const reply3 = `This advanced model tier is currently under development and will be available in an upcoming release.\n\n`;
  const reply4 = `**Currently Available Tiers:**\n`;
  const reply5 = `✅ **Quantara AI Basic** - Fast responses Powered by Hydra 3.2 8B\n`;
  const reply6 = `✅ **Quantara AI Pro** - Balanced intelligence Powered by Hydra 3.0 8B.\n\n`;
  const reply7 = `Please select either **Basic** or **Pro** tier to start chatting with AI right now!\n\n`;
  const reply8 = `Stay tuned for updates on new model releases. 🚀`;
  
  const fullReply = reply + reply2 + reply3 + reply4 + reply5 + reply6 + reply7 + reply8;
  
  const words = fullReply.split(' ');
  for (let i = 0; i < words.length; i++) {
    onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

// 🚀 GROQ API STREAM (For Normal/Basic Tier)
async function callGroqStream(messages, model, onChunk, apiKey, config) {
  console.log('⚡ Calling Groq API with model:', model);
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: config.temp,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', response.status, errorText);
      
      if (response.status === 401) {
        onChunk('❌ Invalid Groq API key. Please check your GROQ_API_KEY in .env\n\n');
        onChunk('Get a free key from: https://console.groq.com');
        return;
      }
      if (response.status === 429) {
        onChunk('⚠️ Rate limit exceeded. Please wait a moment and try again.\n\n');
        return;
      }
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    
    // Add model intro
    onChunk(`🤖 **${config.name}**\n`);
    onChunk(`> ${config.description}\n\n`);
    await new Promise(r => setTimeout(r, 50));
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {}
      }
    }
    
    console.log('✅ Groq response complete, length:', fullResponse.length);
    
  } catch (error) {
    console.error('❌ Groq call error:', error.message);
    onChunk(`\n\n❌ Error: ${error.message}. Please check your internet connection and GROQ_API_KEY.`);
  }
}

// 🌐 OPENROUTER API STREAM (For Medium/Pro Tier)
async function callOpenRouterStream(messages, model, onChunk, apiKey, config) {
  console.log('🌐 Calling OpenRouter API with model:', model);
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'Quantara AI AI',
      },
      body: JSON.stringify({
        model: model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens,
        temperature: config.temp,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hydra API error:', response.status, errorText);
      
      if (response.status === 401) {
        onChunk('❌ Invalid Hydra API key. Please check your Hydra_API_KEY in .env\n\n');
        onChunk('Get a free key from: https://openrouter.ai');
        return;
      }
      if (response.status === 402) {
        onChunk('⚠️ This model requires credits. Please add credits to your Hydra account or try a free model.\n\n');
        return;
      }
      if (response.status === 429) {
        onChunk('⚠️ Rate limit exceeded. Please wait a moment and try again.\n\n');
        return;
      }
      throw new Error(`Hydra API error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    
    // Add model intro
    onChunk(`🤖 **${config.name}**\n`);
    onChunk(`> ${config.description}\n\n`);
    await new Promise(r => setTimeout(r, 50));
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {}
      }
    }
    
    console.log('✅ Hydra response complete, length:', fullResponse.length);
    
  } catch (error) {
    console.error('❌ Hydra call error:', error.message);
    onChunk(`\n\n❌ Error: ${error.message}. Please check your internet connection and Hydra_API_KEY.`);
  }
}

// 🎭 DEMO MODE (When API keys are missing)
async function callMockStream(messages, model, onChunk, reason) {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || 'Hello';
  
  const reply = `[DEMO MODE - ${reason}]\n\n`;
  const reply2 = `You asked: "${lastUserMessage.slice(0, 100)}"\n\n`;
  const reply3 = `⚠️ To get real AI responses, please add your API key to backend/.env:\n\n`;
  const reply4 = `For **Quantara AI Basic** (Fast responses):\n`;
  const reply5 = `Hydra 3.2 =gsk_your_key_here\n`;
  const reply6 = `Get free key from: https://console.groq.com\n\n`;
  const reply7 = `For **Quantara AI Pro** (Balanced intelligence):\n`;
  const reply8 = `Hydra 3.0 =sk-or-v1-your_key_here\n`;
  const reply9 = `Get free key from: https://openrouter.ai\n\n`;
  const reply10 = `Once configured, restart backend for real AI responses! 🚀`;
  
  const fullReply = reply + reply2 + reply3 + reply4 + reply5 + reply6 + reply7 + reply8 + reply9 + reply10;
  
  const words = fullReply.split(' ');
  for (let i = 0; i < words.length; i++) {
    onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
