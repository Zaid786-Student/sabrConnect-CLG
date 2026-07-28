import { cn } from '../../lib/utils'

const variants = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
}

export default function Button({ variant = 'primary', className, children, as: Comp = 'button', ...props }) {
  return (
    <Comp className={cn(variants[variant], className)} {...props}>
      {children}
    </Comp>
  )
}
