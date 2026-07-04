// app/waiting/page.tsx
export default function WaitingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      direction: 'rtl',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{color: '#2ecc71', marginBottom: '20px'}}>✅</h1>
        <h2 style={{color: '#333', marginBottom: '15px'}}>تم استلام طلبك</h2>
        <p style={{color: '#666', marginBottom: '10px'}}>
          سيتم مراجعة الحساب وتفعيله قريبا
        </p>
        <p style={{color: '#666'}}>
          سنقوم بالاتصال بك على الرقم المسجل للتأكيد
        </p>
      </div>
    </div>
  )
}