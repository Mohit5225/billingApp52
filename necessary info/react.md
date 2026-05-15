Fetching on the Client (Client Components)When using native fetch inside "use client" components with the modern React Compiler, you must use React's built-in use() hook instead of legacy useEffect chains to manage your async requests.The Fetch Wrapper (lib/api.ts)Create a utility function to handle your frontend client fetches easily:typescript// lib/api.ts
export async function clientFetch(endpoint: string, token?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
  
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}
Use code with caution.The Client UI Component (components/LiveCounter.tsx)Pass the native fetch promise directly into React's native use() hook. The React Compiler handles optimization under the hood.typescript'use client';
import { use } from 'react';
import { clientFetch } from '@/lib/api';

// 1. Create the persistent promise outside the render cycle or pass it as a prop
const dataPromise = clientFetch('/api/live-status');

export default function LiveCounter() {
  // 2. React's use() hook automatically unpacks the native fetch promise
  const data = use(dataPromise);

  return <div>Live FastAPI Status: {data.status}</div>;
}
Use code with caution.💡 Crucial Tips for Using Pure fetch with FastAPINo Auto-Stringify: Unlike Axios, native fetch does not convert JavaScript objects to JSON automatically for POST requests. You must manually wrap your body data inside JSON.stringify().CORS Rules Apply: Since you are using native fetch from the client's browser straight to your external FastAPI deployment platform, your FastAPI setup must allow your Vercel URL in its CORSMiddleware configuration.Error Handling: Native fetch does not throw an error on 404 or 500 HTTP status codes. It only fails on network failures. You must manually check if (!res.ok) to intercept backend errors.If you are ready to implement this, let me know:Do you need an example of a native fetch POST request for submitting forms to FastAPI?Would you like to see how to wrap client-side fetches in a React Suspense boundary for elegant loading indicators?Fetching on the Client (Client Components)When using native fetch inside "use client" components with the modern React Compiler, you must use React's built-in use() hook instead of legacy useEffect chains to manage your async requests.The Fetch Wrapper (lib/api.ts)Create a utility function to handle your frontend client fetches easily:typescript// lib/api.ts
export async function clientFetch(endpoint: string, token?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
  
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();

why ?The reason you use a fetch wrapper like clientFetch combined with React's built-in use() hook boils down to architectural efficiency, type safety, and how the React Compiler optimizes modern code.Here is exactly why this pattern is preferred over older methods like useEffect:1. Eliminating Boilerplate StateIn legacy React, fetching data requires managing three separate states manually. Every time you write this, you create accidental re-renders that the React Compiler has to spend energy optimizing.Legacy Way (useEffect):typescript// Requires 3 states and 1 effect hook just for one fetch
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('/api')
    .then(res => res.json())
    .then(data => { setData(data); setLoading(false); })
    .catch(err => setError(err));
}, []);
Use code with caution.Modern Way (use()):typescript// Zero local state variables needed.
const data = use(dataPromise); 
Use code with caution.2. Streamlined Authentication (The Token Argument)Because your FastAPI server is on a different platform than your Next.js app, it relies on your Supabase JWT token for security.Writing native fetch inline everywhere means manually copying headers and Authorization: Bearer ${token} onto every single request.The clientFetch wrapper ensures that token handling, base URL resolution (process.env.NEXT_PUBLIC_FASTAPI_URL), and JSON serialization happen in one single location.3. Native Integration with React SuspenseWhen you unpack a promise using the use() hook, React natively integrates with <Suspense>.If the promise returned by clientFetch is still pending, React automatically pauses rendering this specific component and displays your fallback loading UI.If clientFetch throws an error (if (!res.ok) throw new Error(...)), React automatically catches it and passes it to your nearest error.tsx boundary file.4. Why Native Fetch Doesn't Work directly inside use()You cannot safely call a raw fetch() directly inside the use() hook like this: use(fetch('/api')). Doing so creates an infinite loop because fetch() creates a brand-new promise on every single render cycle.Separating your logic into a clientFetch utility allows you to instantiate the promise outside of the active render cycle (e.g., passing it down from a parent or invoking it during an event), keeping your application performant and clean.Would you like to see how to wrap this component in a React Suspense boundary to handle loading states automatically, or how to handle a POST request form submission using this architecture?