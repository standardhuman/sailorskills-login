import { supabase } from '../lib/supabase-client.js'

document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const confirmPassword = document.getElementById('confirm-password').value
  const errorDiv = document.getElementById('error-message')
  const successDiv = document.getElementById('success-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous messages
  errorDiv.style.display = 'none'
  successDiv.style.display = 'none'

  // Validate passwords match
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match'
    errorDiv.style.display = 'block'
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = 'Creating account...'

  try {
    // Sign up with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login.html`
      }
    })

    if (authError) throw authError

    // Create customer account record
    const { error: accountError } = await supabase
      .from('customer_accounts')
      .insert({
        id: authData.user.id,
        email: email,
        magic_link_enabled: true,
        password_enabled: true
      })

    if (accountError) {
      console.warn('Customer account creation warning:', accountError)
      // Don't fail signup if account record fails - can be created later
    }

    // Show success message
    successDiv.textContent = 'Account created! Please check your email to verify your account.'
    successDiv.style.display = 'block'

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 3000)

  } catch (error) {
    console.error('Signup error:', error)
    errorDiv.textContent = error.message || 'Signup failed. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Create Account'
  }
})
