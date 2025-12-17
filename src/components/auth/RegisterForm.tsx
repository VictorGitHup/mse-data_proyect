
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import Step1 from './register/Step1';
import Step2 from './register/Step2';
import { register } from '@/lib/actions/auth.actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
  email: z.string().email({ message: "El correo no es válido." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
  confirmPassword: z.string(),
  username: z.string()
    .min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." })
    .max(50, { message: "El nombre de usuario no puede exceder los 50 caracteres." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Solo letras, números y guiones bajos." }),
  full_name: z.string()
    .min(2, { message: "El nombre completo debe tener al menos 2 caracteres." })
    .max(100, { message: "El nombre completo no puede exceder los 100 caracteres." }),
  role: z.enum(['USER', 'ADVERTISER'], { required_error: "Debes seleccionar un tipo de cuenta." }),
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los términos y condiciones." }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur", // Validate on blur to check username availability
  });

  const nextStep = async () => {
    const isValid = await methods.trigger(["email", "password", "confirmPassword", "username", "full_name"]);
    if (isValid) {
      setStep(2);
    }
  };

  const prevStep = () => setStep(1);

  const onSubmit = async (data: RegisterFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const result = await register(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      // Stay on step 2 to show the error
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Crear una Cuenta</CardTitle>
        <CardDescription>
          Paso {step} de 2: {step === 1 ? 'Datos básicos' : 'Tipo de cuenta'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
                >
                  <Step1 nextStep={nextStep} />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                   {errorMessage && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                        {errorMessage}
                    </div>
                   )}
                  <Step2 prevStep={prevStep} />
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
