import { Outlet } from "react-router"
import Header from '@/components/NavBar';


function App() {

  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

export default App
