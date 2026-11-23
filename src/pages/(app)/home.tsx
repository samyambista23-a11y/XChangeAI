/** /home is kept as an alias; the shop lives at /shelves. */

import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/shelves" replace />
}
