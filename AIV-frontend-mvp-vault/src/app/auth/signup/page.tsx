'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
})

type SignupSchemaType = z.infer<typeof signupSchema>

function PasswordInput({
  form,
  isPending,
}: {
  form: ReturnType<typeof useForm<SignupSchemaType>>
  isPending: boolean
}) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="flex items-center">
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  {...field}
                  disabled={isPending}
                  placeholder="••••••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
  })

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      toast.success('Account created! Please verify your email.')
      const params = new URLSearchParams({ email: form.getValues('email') })
      if (data.dev_otp) {
        params.set('dev_otp', data.dev_otp)
      }
      router.push(`/auth/verify?${params.toString()}`)
    },
    onError: (error: Error & { response?: { data?: { detail?: string | Array<{ msg: string }> } } }) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : detail || 'Sign up failed'
      toast.error(message)
    },
  })

  const onSubmit = (data: SignupSchemaType) => {
    signupMutation.mutate({
      name: data.name,
      username: data.username,
      email: data.email,
      password: data.password,
    })
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-bold text-3xl">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Enter your information below to create your account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      {...field}
                      disabled={signupMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="johndoe"
                      {...field}
                      disabled={signupMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      disabled={signupMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label>Password</Label>
            <PasswordInput form={form} isPending={signupMutation.isPending} />
          </div>

          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      {...field}
                      disabled={signupMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            disabled={signupMutation.isPending || !form.formState.isValid}
          >
            {signupMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Account
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/auth/signin" className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  )
}
