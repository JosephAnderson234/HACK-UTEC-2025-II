import App from "@/App";
import HomePage from "@/pages/Home";
import LoginPage from "@/pages/Login";
import NotFoundPage from "@/pages/NotFound";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./ProtectedRoute";
import DashboardPage from "@/pages/Dashboard";



const router = createBrowserRouter([
    {
        path:"/",
        element:<App/>,
        children: [
            {
                path:"",
                element: <HomePage/>,
            },
            {
                path:"login",
                element:<LoginPage/>
            },
            {
                path:"", 
                element: <ProtectedRoute/>,
                children: 
                [
                    {
                        path:"dashboard",
                        element: <DashboardPage/>
                    }
                ]
            },
            {
                path:"*",
                element: <NotFoundPage/>
            }
        ]
    },
])


export default router;