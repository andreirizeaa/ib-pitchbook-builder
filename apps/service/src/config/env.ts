import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const env = {
  PORT: parseInt(process.env.PORT || '8002', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8000',
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  SEC_EDGAR_USER_AGENT: process.env.SEC_EDGAR_USER_AGENT || 'pitchdeck@example.com',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'pitchdeck-files',
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY || '',
};

export default env;
