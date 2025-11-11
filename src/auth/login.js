import { login, supabase } from '../lib/supabase-client.js'

// Check for magic link callback or existing session on page load
(async () => {
  try {
    // Wait for Supabase to process PKCE code parameter if present
    const hasCodeParam = window.location.search.includes('code=')
    if (hasCodeParam) {
      console.log('[LOGIN] PKCE code detected, waiting for Supabase to process...')
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[LOGIN] Session error:', error)
      return // Don't redirect on error, show login form
    }

    console.log('[LOGIN] Session check:', {
      hasSession: !!session,
      hasCodeParam,
      userEmail: session?.user?.email
    })

    if (session) {
      // User authenticated via magic link or has existing session
      console.log('[LOGIN] Session found, fetching user role...')

      // Fetch user role to determine redirect
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (profileError) {
        console.warn('[LOGIN] No user_profile found, defaulting to customer role')
      }

      const role = profile?.role || 'customer'
      console.log('[LOGIN] User role:', role)

      const redirectUrl = getRoleBasedRedirect(role)
      console.log('[LOGIN] Redirecting to:', redirectUrl)

      // Transfer session to target service
      // Note: Don't use type='recovery' (that's for password reset flows)
      const hashParams = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in.toString(),
        token_type: session.token_type
      })

      window.location.href = `${redirectUrl}#${hashParams.toString()}`
      return
    }

    console.log('[LOGIN] No session found, showing login form')
  } catch (err) {
    console.error('[LOGIN] Fatal error:', err)
    // Show login form on any error
  }
})()

// Tab switching functionality
const tabs = document.querySelectorAll('.auth-tab')
const panels = document.querySelectorAll('.auth-panel')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs and panels
    tabs.forEach(t => t.classList.remove('active'))
    panels.forEach(p => p.classList.remove('active'))

    // Add active class to clicked tab
    tab.classList.add('active')

    // Show corresponding panel
    const tabName = tab.dataset.tab
    document.getElementById(`${tabName}-panel`).classList.add('active')
  })
})

// Get redirect URL from query params
const urlParams = new URLSearchParams(window.location.search)
const explicitRedirect = urlParams.get('redirect')

/**
 * Get role-based redirect URL
 * @param {string} role - User role (customer, staff, admin)
 * @returns {string} Redirect URL
 */
function getRoleBasedRedirect(role) {
  // If there's an explicit redirect, use it
  if (explicitRedirect) {
    return explicitRedirect
  }

  // Otherwise, redirect based on role
  // Use production custom domains
  switch (role) {
    case 'customer':
      return 'https://portal.sailorskills.com/portal.html'
    case 'staff':
      return 'https://ops.sailorskills.com'
    case 'admin':
      return 'https://ops.sailorskills.com' // Admin goes to Operations by default
    case 'unknown':
      // If role detection failed, default to Operations (safer for staff/admin)
      return 'https://ops.sailorskills.com'
    default:
      // Fallback to Portal for unrecognized roles
      console.warn(`Unrecognized role: ${role}, redirecting to Portal`)
      return 'https://portal.sailorskills.com/portal.html'
  }
}

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type ('success' or 'error')
 */
function showAlert(message, type = 'error') {
  const container = document.getElementById('alert-container')
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`
}

/**
 * Clear alert messages
 */
function clearAlert() {
  document.getElementById('alert-container').innerHTML = ''
}

// Handle password login form submission
document.getElementById('password-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearAlert()

  const email = document.getElementById('password-email').value
  const password = document.getElementById('password').value
  const submitBtn = document.getElementById('password-login-btn')

  submitBtn.disabled = true
  submitBtn.textContent = 'Signing in...'

  try {
    const result = await login(email, password)
    console.log('Login result:', result) // Debug: full result

    if (result.success) {
      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession()

      // Login successful - redirect based on role with session in URL
      const role = result.role || 'unknown'
      console.log(`Login successful. User role: "${role}"`)

      // Temporary debug alert
      if (!result.role) {
        alert(`DEBUG: Role is undefined! Full result: ${JSON.stringify(result)}`)
      }

      const redirectUrl = getRoleBasedRedirect(role)
      console.log(`Redirecting to: ${redirectUrl}`)

      // Include session tokens in URL hash for cross-domain auth
      if (session) {
        const hashParams = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in.toString(),
          token_type: session.token_type
          // Note: Don't include type='recovery' (that's for password reset only)
        })
        window.location.href = `${redirectUrl}#${hashParams.toString()}`
      } else {
        window.location.href = redirectUrl
      }
    } else {
      // Login failed - show error
      showAlert(result.error || 'Login failed. Please check your credentials.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Sign In'
    }
  } catch (error) {
    console.error('Login error:', error)
    showAlert('An unexpected error occurred. Please try again.')
    submitBtn.disabled = false
    submitBtn.textContent = 'Sign In'
  }
})

// Handle magic link form submission
document.getElementById('magic-link-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearAlert()

  const email = document.getElementById('magic-link-email').value
  const submitBtn = document.getElementById('magic-link-btn')

  submitBtn.disabled = true
  submitBtn.textContent = 'Sending...'

  try {
    const redirectTo = explicitRedirect || `${window.location.origin}/login.html`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error) throw error

    // Show success message
    showAlert('Magic link sent! Check your email to sign in.', 'success')
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Magic Link'

    // Clear form
    document.getElementById('magic-link-form').reset()
  } catch (error) {
    console.error('Magic link error:', error)
    showAlert(error.message || 'Failed to send magic link. Please try again.')
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Magic Link'
  }
})
