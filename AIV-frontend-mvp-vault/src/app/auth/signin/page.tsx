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
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

const signinSchema = z.object({
  identifier: z.string().min(3, 'Please enter your email or username'),
  password: z.string().min(1, 'Password is required'),
})

type SigninSchemaType = z.infer<typeof signinSchema>

function PasswordInput({
  form,
  isPending,
}: {
  form: ReturnType<typeof useForm<SigninSchemaType>>
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

export default function SigninPage() {
  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(signinSchema),
    mode: 'onChange',
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const signinMutation = useMutation({
    mutationFn: authApi.signin,
    onSuccess: async (data) => {
      localStorage.setItem('user', JSON.stringify(data))
      toast.success('Signed in successfully')
      window.location.href = '/'
    },
    onError: (error: Error & { response?: { data?: { detail?: string | Array<{ msg: string }> } } }) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : detail || 'Sign in failed'
      toast.error(message)
    },
  })

  const onSubmit = (data: SigninSchemaType) => {
    signinMutation.mutate({ identifier: data.identifier, password: data.password })
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-bold text-3xl">Welcome Back</h1>
        <p className="text-balance text-muted-foreground text-sm">
          Enter your email or username to login
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Username</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="john@example.com or johndoe"
                      {...field}
                      disabled={signinMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <PasswordInput form={form} isPending={signinMutation.isPending} />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!form.formState.isValid || signinMutation.isPending}
          >
            {signinMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-2" />
            )}
            Login
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
    </div>
  )
}
