import { wrapLanguageModel, customProvider, extractReasoningMiddleware, gateway } from 'ai';

import { createOpenAI, openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { anthropic } from "@ai-sdk/anthropic";
import { cohere } from '@ai-sdk/cohere';

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

const middlewareWithStartWithReasoning = extractReasoningMiddleware({
  tagName: 'think',
  startWithReasoning: true,
});

const huggingface = createOpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN,
});

const anannas = createOpenAI({
  baseURL: 'https://api.anannas.ai/v1',
  apiKey: process.env.ANANNAS_API_KEY,
  headers: {
    'HTTP-Referer': 'https://ritivel.ai',
    'X-Title': 'Ritivel AI',
    'Content-Type': 'application/json',
  },
});

export const ritivel = customProvider({
  languageModels: {
    'ritivel-default': openai('gpt-4.1-mini'),
    'ritivel-nano': groq('llama-3.3-70b-versatile'),
    'ritivel-name': anannas.chat('meta-llama/llama-3.3-70b-instruct'),
    'ritivel-grok-3-mini': xai('grok-3-mini'),
    'ritivel-grok-3': xai('grok-3'),
    'ritivel-grok-4': xai('grok-4'),
    'ritivel-grok-4-fast': xai('grok-4-fast-non-reasoning'),
    'ritivel-grok-4-fast-think': xai('grok-4-fast'),
    'ritivel-code': xai('grok-code-fast-1'),
    'ritivel-enhance': groq('moonshotai/kimi-k2-instruct-0905'),
    'ritivel-follow-up': xai('grok-4-fast-non-reasoning'),
    'ritivel-qwen-4b': huggingface.chat('Qwen/Qwen3-4B-Instruct-2507:nscale'),
    'ritivel-qwen-4b-thinking': wrapLanguageModel({
      model: huggingface.chat('Qwen/Qwen3-4B-Thinking-2507:nscale'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'ritivel-gpt-4.1-nano': openai('gpt-4.1-nano'),
    'ritivel-gpt-4.1-mini': openai('gpt-4.1-mini'),
    'ritivel-gpt-4.1': openai('gpt-4.1'),
    'ritivel-gpt5': openai('gpt-5'),
    'ritivel-gpt5-medium': openai('gpt-5'),
    'ritivel-gpt5-mini': openai('gpt-5-mini'),
    'ritivel-gpt5-nano': openai('gpt-5-nano'),
    'ritivel-o3': openai('o3'),
    'ritivel-o4-mini': openai('o4-mini'),
    'ritivel-gpt5-codex': openai('gpt-5-codex'),
    'ritivel-qwen-32b': wrapLanguageModel({
      model: groq('qwen/qwen3-32b'),
      middleware,
    }),
    'ritivel-gpt-oss-20': wrapLanguageModel({
      model: groq('openai/gpt-oss-20b'),
      middleware,
    }),
    'ritivel-gpt-oss-120': wrapLanguageModel({
      model: gateway('openai/gpt-oss-120b'),
      middleware,
    }),
    'ritivel-deepseek-chat': gateway('deepseek/deepseek-v3.2-exp'),
    'ritivel-deepseek-chat-think': wrapLanguageModel({
      model: gateway('deepseek/deepseek-v3.2-exp-thinking'),
      middleware,
    }),
    'ritivel-deepseek-r1': wrapLanguageModel({
      model: anannas.chat('deepseek/deepseek-r1'),
      middleware,
    }),
    'ritivel-deepseek-r1-0528': wrapLanguageModel({
      model: anannas.chat('deepseek/deepseek-r1-0528'),
      middleware,
    }),
    'ritivel-qwen-coder': huggingface.chat('Qwen/Qwen3-Coder-480B-A35B-Instruct:cerebras'),
    'ritivel-qwen-30': huggingface.chat('Qwen/Qwen3-30B-A3B-Instruct-2507:nebius'),
    'ritivel-qwen-30-think': wrapLanguageModel({
      model: huggingface.chat('Qwen/Qwen3-30B-A3B-Thinking-2507:nebius'),
      middleware,
    }),
    'ritivel-qwen-3-next': huggingface.chat('Qwen/Qwen3-Next-80B-A3B-Instruct:hyperbolic'),
    'ritivel-qwen-3-next-think': wrapLanguageModel({
      model: huggingface.chat('Qwen/Qwen3-Next-80B-A3B-Thinking:hyperbolic'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'ritivel-qwen-3-max': gateway('alibaba/qwen3-max'),
    'ritivel-qwen-3-max-preview': gateway('alibaba/qwen3-max-preview'),
    'ritivel-qwen-235': huggingface.chat('Qwen/Qwen3-235B-A22B-Instruct-2507:fireworks-ai'),
    'ritivel-qwen-235-think': wrapLanguageModel({
      model: huggingface.chat('Qwen/Qwen3-235B-A22B-Thinking-2507:fireworks-ai'),
      middleware: [middlewareWithStartWithReasoning],
    }),
    'ritivel-glm-air': gateway('zai/glm-4.5-air'),
    'ritivel-glm': wrapLanguageModel({
      model: gateway('zai/glm-4.5'),
      middleware,
    }),
    'ritivel-glm-4.6': wrapLanguageModel({
      model: huggingface.chat('zai-org/GLM-4.6:novita'),
      middleware,
    }),
    'ritivel-cmd-a': cohere('command-a-03-2025'),
    'ritivel-cmd-a-think': cohere('command-a-reasoning-08-2025'),
    'ritivel-kimi-k2-v2': groq('moonshotai/kimi-k2-instruct-0905'),
    'ritivel-haiku': anannas.chat('anthropic/claude-3-5-haiku-20241022'),
    'ritivel-mistral-medium': mistral('mistral-medium-2508'),
    'ritivel-magistral-small': mistral('magistral-small-2509'),
    'ritivel-magistral-medium': mistral('magistral-medium-2509'),
    'ritivel-google-lite': google('gemini-flash-lite-latest'),
    'ritivel-google': google('gemini-flash-latest'),
    'ritivel-google-think': google('gemini-flash-latest'),
    'ritivel-google-pro': google('gemini-2.5-pro'),
    'ritivel-google-pro-think': google('gemini-2.5-pro'),
    'ritivel-anthropic': anthropic('claude-sonnet-4-5'),
  },
});

interface ModelParameters {
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  frequencyPenalty?: number;
}

interface Model {
  value: string;
  label: string;
  description: string;
  vision: boolean;
  reasoning: boolean;
  experimental: boolean;
  category: string;
  pdf: boolean;
  pro: boolean;
  requiresAuth: boolean;
  freeUnlimited: boolean;
  maxOutputTokens: number;
  extreme?: boolean;
  fast?: boolean;
  isNew?: boolean;
  parameters?: ModelParameters;
}

export const models: Model[] = [
  // Models (xAI)
  {
    value: 'ritivel-grok-3-mini',
    label: 'Grok 3 Mini',
    description: "xAI's recent smallest LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ritivel-grok-3',
    label: 'Grok 3',
    description: "xAI's recent smartest LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ritivel-grok-4',
    label: 'Grok 4',
    description: "xAI's most intelligent LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ritivel-default',
    label: 'GPT 4.1 Mini',
    description: "OpenAI's small LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: true,
    isNew: true,
  },
  {
    value: 'ritivel-grok-4-fast-think',
    label: 'Grok 4 Fast Thinking',
    description: "xAI's fastest multimodel reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: true,
    isNew: true,
  },
  {
    value: 'ritivel-qwen-32b',
    label: 'Qwen 3 32B',
    description: "Alibaba's advanced reasoning LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 40960,
    fast: true,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'ritivel-qwen-4b',
    label: 'Qwen 3 4B',
    description: "Alibaba's small base LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    maxOutputTokens: 16000,
    freeUnlimited: false,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'ritivel-qwen-4b-thinking',
    label: 'Qwen 3 4B Thinking',
    description: "Alibaba's small base LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: true,
    maxOutputTokens: 16000,
    freeUnlimited: false,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      topK: 20,
      minP: 0,
    },
  },
  {
    value: 'ritivel-gpt-oss-20',
    label: 'GPT OSS 20B',
    description: "OpenAI's small OSS LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'ritivel-gpt5-nano',
    label: 'GPT 5 Nano',
    description: "OpenAI's smallest flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: true,
  },
  {
    value: 'ritivel-google-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: "Google's advanced small LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    extreme: true,
    isNew: true,
  },
  {
    value: 'ritivel-code',
    label: 'Grok Code',
    description: "xAI's advanced coding LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'ritivel-mistral-medium',
    label: 'Mistral Medium',
    description: "Mistral's medium multi-modal LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-magistral-small',
    label: 'Magistral Small',
    description: "Mistral's small reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-magistral-medium',
    label: 'Magistral Medium',
    description: "Mistral's medium reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-gpt-oss-120',
    label: 'GPT OSS 120B',
    description: "OpenAI's advanced OSS LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
  },
  {
    value: 'ritivel-gpt-4.1-nano',
    label: 'GPT 4.1 Nano',
    description: "OpenAI's smallest LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: true,
  },
  {
    value: 'ritivel-gpt-4.1-mini',
    label: 'GPT 4.1 Mini',
    description: "OpenAI's small LLM",
    vision: true,
    reasoning: false,
    category: 'Free',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: true,
    extreme: true,
    experimental: false,
  },
  {
    value: 'ritivel-gpt-4.1',
    label: 'GPT 4.1',
    description: "OpenAI's LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-gpt5-mini',
    label: 'GPT 5 Mini',
    description: "OpenAI's small flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-gpt5',
    label: 'GPT 5',
    description: "OpenAI's flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-o4-mini',
    label: 'o4 mini',
    description: "OpenAI's recent mini reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-o3',
    label: 'o3',
    description: "OpenAI's advanced LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-gpt5-medium',
    label: 'GPT 5 Medium',
    description: "OpenAI's latest flagship reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-gpt5-codex',
    label: 'GPT 5 Codex',
    description: "OpenAI's advanced coding LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    extreme: true,
    fast: false,
    isNew: true,
  },
  {
    value: 'ritivel-cmd-a',
    label: 'Command A',
    description: "Cohere's advanced command LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-cmd-a-think',
    label: 'Command A Thinking',
    description: "Cohere's advanced command LLM with thinking",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-deepseek-chat',
    label: 'DeepSeek 3.2 Exp',
    description: "DeepSeek's advanced chat LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-deepseek-chat-think',
    label: 'DeepSeek 3.2 Exp Thinking',
    description: "DeepSeek's advanced chat LLM with thinking",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-deepseek-r1',
    label: 'DeepSeek R1',
    description: "DeepSeek's advanced reasoning LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-deepseek-r1-0528',
    label: 'DeepSeek R1 0528',
    description: "DeepSeek's advanced reasoning LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
    isNew: true,
  },
  {
    value: 'ritivel-qwen-coder',
    label: 'Qwen 3 Coder 480B-A35B',
    description: "Alibaba's advanced coding LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
    fast: true,
  },
  {
    value: 'ritivel-qwen-3-next',
    label: 'Qwen 3 Next 80B A3B Instruct',
    description: "Qwen's advanced instruct LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    fast: true,
    isNew: true,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      minP: 0,
    },
  },
  {
    value: 'ritivel-qwen-3-next-think',
    label: 'Qwen 3 Next 80B A3B Thinking',
    description: "Qwen's advanced thinking LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    isNew: true,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      minP: 0,
    },
  },
  {
    value: 'ritivel-qwen-3-max',
    label: 'Qwen 3 Max',
    description: "Qwen's advanced instruct LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-qwen-3-max-preview',
    label: 'Qwen 3 Max Preview',
    description: "Qwen's advanced instruct LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-qwen-235',
    label: 'Qwen 3 235B A22B',
    description: "Qwen's advanced instruct LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    parameters: {
      temperature: 0.7,
      topP: 0.8,
      minP: 0,
    },
  },
  {
    value: 'ritivel-qwen-235-think',
    label: 'Qwen 3 235B A22B Thinking',
    description: "Qwen's advanced thinking LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 100000,
    parameters: {
      temperature: 0.6,
      topP: 0.95,
      minP: 0,
    },
  },
  {
    value: 'ritivel-kimi-k2-v2',
    label: 'Kimi K2 Latest',
    description: "MoonShot AI's advanced base LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
    fast: true,
    parameters: {
      temperature: 0.6,
    },
  },
  {
    value: 'ritivel-glm-4.6',
    label: 'GLM 4.6',
    description: "Zhipu AI's advanced reasoning LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
    isNew: true,
    parameters: {
      temperature: 1,
      topP: 0.95,
    },
  },
  {
    value: 'ritivel-glm-air',
    label: 'GLM 4.5 Air',
    description: "Zhipu AI's efficient base LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 130000,
  },
  {
    value: 'ritivel-glm',
    label: 'GLM 4.5',
    description: "Zhipu AI's previous advanced LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 13000,
  },
  {
    value: 'ritivel-google',
    label: 'Gemini 2.5 Flash',
    description: "Google's advanced small LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    extreme: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-google-think',
    label: 'Gemini 2.5 Flash Thinking',
    description: "Google's advanced small LLM with thinking",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    extreme: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-google-pro',
    label: 'Gemini 2.5 Pro',
    description: "Google's advanced LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    extreme: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-google-pro-think',
    label: 'Gemini 2.5 Pro Thinking',
    description: "Google's advanced LLM with thinking",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    extreme: true,
    maxOutputTokens: 10000,
    isNew: true,
  },
  {
    value: 'ritivel-anthropic',
    label: 'Claude Sonnet 4.5',
    description: "Anthropic's latest and greatest LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 8000,
    isNew: true,
  },
];

// Helper functions for model access checks
export function getModelConfig(modelValue: string) {
  return models.find((model) => model.value === modelValue);
}

export function requiresAuthentication(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresAuth || false;
}

export function requiresProSubscription(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pro || false;
}

export function isFreeUnlimited(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.freeUnlimited || false;
}

export function hasVisionSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.vision || false;
}

export function hasPdfSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pdf || false;
}

export function hasReasoningSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.reasoning || false;
}

export function isExperimentalModel(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.experimental || false;
}

export function getMaxOutputTokens(modelValue: string): number {
  const model = getModelConfig(modelValue);
  return model?.maxOutputTokens || 8000;
}

export function getModelParameters(modelValue: string): ModelParameters {
  const model = getModelConfig(modelValue);
  return model?.parameters || {};
}

// Access control helper
export function canUseModel(modelValue: string, user: any, isProUser: boolean): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);

  if (!model) {
    return { canUse: false, reason: 'Model not found' };
  }

  // Check if model requires authentication
  if (model.requiresAuth && !user) {
    return { canUse: false, reason: 'authentication_required' };
  }

  // Check if model requires Pro subscription
  if (model.pro && !isProUser) {
    return { canUse: false, reason: 'pro_subscription_required' };
  }

  return { canUse: true };
}

// Helper to check if user should bypass rate limits
export function shouldBypassRateLimits(modelValue: string, user: any): boolean {
  const model = getModelConfig(modelValue);
  return Boolean(user && model?.freeUnlimited);
}

// Get acceptable file types for a model
export function getAcceptedFileTypes(modelValue: string, isProUser: boolean): string {
  const model = getModelConfig(modelValue);
  if (model?.pdf && isProUser) {
    return 'image/*,.pdf';
  }
  return 'image/*';
}

// Check if a model supports extreme mode
export function supportsExtremeMode(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.extreme || false;
}

// Get models that support extreme mode
export function getExtremeModels(): Model[] {
  return models.filter((model) => model.extreme);
}

// Restricted regions for OpenAI and Anthropic models
const RESTRICTED_REGIONS = ['CN', 'KP', 'RU']; // China, North Korea, Russia

// Models that should be filtered in restricted regions
const OPENAI_MODELS = [
  'ritivel-gpt5',
  'ritivel-gpt5-mini',
  'ritivel-gpt5-nano',
  'ritivel-o3',
  'ritivel-gpt-oss-20',
  'ritivel-gpt-oss-120',
];

const ANTHROPIC_MODELS = ['ritivel-haiku', 'ritivel-anthropic'];

// Check if a model should be filtered based on region
export function isModelRestrictedInRegion(modelValue: string, countryCode?: string): boolean {
  if (!countryCode) return false;

  const isRestricted = RESTRICTED_REGIONS.includes(countryCode.toUpperCase());
  if (!isRestricted) return false;

  const isOpenAI = OPENAI_MODELS.includes(modelValue);
  const isAnthropic = ANTHROPIC_MODELS.includes(modelValue);

  return isOpenAI || isAnthropic;
}

// Filter models based on user's region
export function getFilteredModels(countryCode?: string): Model[] {
  if (!countryCode || !RESTRICTED_REGIONS.includes(countryCode.toUpperCase())) {
    return models;
  }

  return models.filter((model) => !isModelRestrictedInRegion(model.value, countryCode));
}

// Legacy arrays for backward compatibility (deprecated - use helper functions instead)
export const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
export const proRequiredModels = models.filter((m) => m.pro).map((m) => m.value);
export const freeUnlimitedModels = models.filter((m) => m.freeUnlimited).map((m) => m.value);
