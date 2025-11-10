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
 * Custom storage for Supabase with SSO cookie domain
 */
const customStorage = {
  getItem: (key) => {
    const localValue = localStorage.getItem(key)
    if (localValue) return localValue
    return getCookie(key)
  },

  setItem: (key, value) => {
    localStorage.setItem(key, value)
    // Set domain to .sailorskills.com for SSO across subdomains
    setCookie(key, value, { domain: '.sailorskills.com' })
  },

  removeItem: (key) => {
    localStorage.removeItem(key)
    setCookie(key, '', { domain: '.sailorskills.com', maxAge: -1 })
  }
}

/**
 * Supabase client configured for SSO
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
      flowType: 'pkce'
    },
    cookieOptions: {
      name: 'sb-auth-token',
      domain: '.sailorskills.com', // Shared domain for SSO
      path: '/',
      sameSite: 'lax',
      maxAge: 604800
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
