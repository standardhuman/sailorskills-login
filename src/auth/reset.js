import { supabase } from '../lib/supabase-client.js'

document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const errorDiv = document.getElementById('error-message')
  const successDiv = document.getElementById('success-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous messages
  errorDiv.style.display = 'none'
  successDiv.style.display = 'none'

  submitBtn.disabled = true
  submitBtn.textContent = 'Sending...'

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`
    })

    if (error) throw error

    // Show success message
    successDiv.textContent = 'Password reset link sent! Check your email.'
    successDiv.style.display = 'block'

    // Reset form
    document.getElementById('reset-form').reset()
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Reset Link'

  } catch (error) {
    console.error('Reset error:', error)
    errorDiv.textContent = error.message || 'Failed to send reset link. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Reset Link'
  }
})
