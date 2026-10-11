import { useTheme } from "@/hooks/useTheme"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/** Toast frame and type come from the `[data-sonner-toast]` rules in index.css, so every theme restyles them. */
const Toaster = (props: ToasterProps) => {
  const { colorScheme } = useTheme()
  return <Sonner theme={colorScheme} {...props} />
}

export { Toaster }
