{/* Record Button (smaller) */}
<div
  style={{
    margin: '40px auto 0 auto',
    width: 120, // smaller width
    height: 120, // smaller height
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  }}
>
  <div
    style={{
      width: 60, // smaller inner circle
      height: 60,
      borderRadius: '50%',
      background: 'red',
      border: '8px solid #fff',
      boxSizing: 'border-box',
    }}
  />
</div>

{/* Save Button (raised and fixed) */}
<button
  style={{
    position: 'fixed',
    left: '50%',
    bottom: '80px', // raised above browser bar
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: 400,
    padding: '18px 0',
    fontSize: 22,
    background: '#ccc',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    zIndex: 1001,
  }}
>
  Save
</button> 