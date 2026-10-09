import { AbasEstadias } from '@/features/estadias/components/abas-estadias';

export default function LayoutAbas({ children }: LayoutProps<'/estadias'>) {
  return <AbasEstadias>{children}</AbasEstadias>;
}
