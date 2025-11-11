import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cookie utilities for cross-subdomain authentication
 */
function setCookie(name, value, options = {}) {
  const {
    domain = '',
    path = '/',
    maxAge = 604800,
    sameSite = 'lax',
    secure = true
  } = options

  let cookie = `${name}=${value}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`

  if (domain) {
    cookie += `; domain=${domain}`
  }

  if (secure) {
    cookie += '; secure'
  }

  document.cookie = cookie
}

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return null
}

/**
 * Custom storage for Supabase using localStorage only
 *
 * Note: We use localStorage instead of cookies because Supabase session objects
 * are typically 2-5KB and exceed the 4KB cookie size limit, causing truncation
 * and authentication failures (429/400 errors).
 */
const customStorage = {
  getItem: (key) => {
    return localStorage.getItem(key)
  },

  setItem: (key, value) => {
    localStorage.setItem(key, value)
  },

  removeItem: (key) => {
    localStorage.removeItem(key)
  }
}

/**
 * Supabase client for login service
 *
 * Uses localStorage for session persistence (default for @supabase/supabase-js).
 * Cross-subdomain authentication is handled by transferring session to target service.
 */
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit' // Use implicit flow for magic links (PKCE requires code_verifier to persist across email click)
    }
  }
)

/**
 * Login with email and password
 */
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // Fetch user role from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, service_access')
      .eq('user_id', data.user.id)
      .single()

    // Log profile query result for debugging
    console.log('Profile query result:', { profile, profileError })

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
    }

    return {
      success: true,
      user: data.user,
      role: profile?.role,
      serviceAccess: profile?.service_access
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Enable debug logging in development
 */
export function enableAuthDebug() {
  if (import.meta.env.DEV) {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Debug]', event, {
        userId: session?.user?.id,
        email: session?.user?.email
      })
    })
  }
}
