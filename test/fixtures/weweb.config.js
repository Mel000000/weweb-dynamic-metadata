import dotenv from 'dotenv';
dotenv.config();

// weweb.config.js - User's config file
export default{
  supabase: {
    url: process.env.SUPABASE_URL,  // User's own URL
    anonKey:  process.env.SUPABASE_ANON_KEY  // User's own key
  },
  pages: [
    {
      route: '/article/:id',
      table: 'properties',
      metadata: {
        title : "title",
        content: "content",
        image_url: "image_url"
      }
    }
  ]
};  