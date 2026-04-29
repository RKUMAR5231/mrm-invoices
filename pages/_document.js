import { Html, Head, Main, NextScript } from 'next/document'

export default function Document(props) {
  const isInvoice = props.__NEXT_DATA__?.page?.startsWith('/invoice/')
  return (
    <Html lang="en" data-page={isInvoice ? 'invoice' : 'app'}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
