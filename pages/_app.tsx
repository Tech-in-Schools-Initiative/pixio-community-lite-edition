import type { AppProps } from 'next/app';
import '@xyflow/react/dist/style.css';
import '../styles/index.css';

export default function PixioApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
