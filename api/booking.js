const services = {
  "Vágás": 30,
  "Női festés": 90,
  "Balayage": 120,
  "Férfi szegély": 15
};

const bookingForm = document.getElementById('bookingForm');
const serviceSelect = document.getElementById('serviceSelect');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const bookingMsg = document.getElementById('bookingMsg');

dateInput.addEventListener('change', () => {
  const date = new Date(dateInput.value);
  const day = date.getDay();
  if(day===0||day===6){
    alert("Csak hétköznapra lehet foglalni!");
    dateInput.value = '';
  }
});

timeInput.addEventListener('input', () => {
  const hour = parseInt(timeInput.value.split(':')[0]);
  if(hour<9||hour>=20){
    alert("Csak 9:00–20:00 közötti időpont választható!");
    timeInput.value = '';
  }
});

bookingForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const email=document.getElementById('email').value.trim();
  const service=serviceSelect.value;
  const date=dateInput.value;
  const time=timeInput.value;

  if(!name||!phone||!email||!service||!date||!time||!document.getElementById('gdpr').checked){
    bookingMsg.textContent='Kérlek töltsd ki az összes mezőt és fogadd el az adatkezelést.';
    return;
  }

  const duration=services[service];
  const start=new Date(`${date}T${time}`);
  const end=new Date(start.getTime()+duration*60000);

  try{
    const res = await fetch('/api/booking',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name, phone, email, service, start:start.toISOString(), end:end.toISOString(), price:null})
    });
    const data = await res.json();
    if(res.ok){
      bookingMsg.textContent='Foglalás sikeresen elküldve!';
      bookingForm.reset();
    }else{
      bookingMsg.textContent=data.error||'Hiba történt.';
    }
  }catch(err){
    bookingMsg.textContent='Hálózati hiba, próbáld később.';
  }
});
