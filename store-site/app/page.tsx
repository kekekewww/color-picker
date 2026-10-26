import policy from './policy-content.json';

export default function Home() {
  // Build-time content from the bundled policy; never user-supplied HTML.
  return <div dangerouslySetInnerHTML={{ __html: policy }} />;
}
