import App from "@/App";
import HomePage from "@/pages/Home";
import LoginPage from "@/pages/Login";
import NotFoundPage from "@/pages/NotFound";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./ProtectedRoute";
import DashboardPage from "@/pages/Dashboard";
import RegisterPage from "@/pages/Register";
import ReportPage from "@/pages/ReportPage";
import CreateReportPage from "@/pages/CreateReportPage";



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
                path:"register",
                element:<RegisterPage/>
            },
            {
                path:"", 
                element: <ProtectedRoute/>,
                children: 
                [
                    {
                        path:"dashboard",
                        element: <DashboardPage/>
                    },
                    {
                        path:"report",
                        element: <ReportPage/>,
                        children:[
                            {
                                path:"new",
                                element: <CreateReportPage/>
                            }
                        ]
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