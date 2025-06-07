import React, { useState } from 'react'
import { LogIn, UserPlus, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../ui/NotificationContainer'

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { signIn, signUp, loading } = useAuth()
  const { showNotification } = useNotification()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!email) {
      newErrors.email = 'Email requis'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide'
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis'
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password)
        if (error) {
          if (error.message.includes('already registered')) {
            showNotification('error', 'Cet email est déjà utilisé')
          } else {
            showNotification('error', error.message)
          }
        } else {
          showNotification('success', 'Compte créé avec succès! Vérifiez votre email.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            showNotification('error', 'Email ou mot de passe incorrect')
          } else {
            showNotification('error', error.message)
          }
        } else {
          showNotification('success', 'Connexion réussie!')
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      showNotification('error', 'Une erreur est survenue')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Créer un compte' : 'Connexion'}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {isSignUp 
              ? 'Créez votre compte pour commencer' 
              : 'Connectez-vous à votre compte'
            }
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                className="pl-10"
                fullWidth
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                className="pl-10 pr-10"
                fullWidth
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  className="pl-10"
                  fullWidth
                  required
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              icon={isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            >
              {loading 
                ? 'Chargement...' 
                : isSignUp 
                  ? 'Créer le compte' 
                  : 'Se connecter'
              }
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setErrors({})
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isSignUp 
                  ? 'Déjà un compte ? Se connecter' 
                  : 'Pas de compte ? Créer un compte'
                }
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default AuthForm