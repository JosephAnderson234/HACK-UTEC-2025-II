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
import AllReportsPage from "@/pages/AllReports";
import MyReportsPage from "@/pages/MyReports";
import AssignedReportsPage from "@/pages/AssignedReportsPage";
import AssignReportsPage from "@/pages/AssignRp";
import PredictionsPage from "@/pages/PredictionsPage";
import ManageUsers from "@/pages/ManageUsers";



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
                        path:"my-report",
                        element: <MyReportsPage/>
                    },
                    {
                        path:"report",
                        element: <AllReportsPage/>
                    },
                    {
                        path:"report/new",
                        element: <CreateReportPage/>
                    },
                    {
                        path:"report/assigned",
                        element: <AssignedReportsPage/>
                    },
                    {
                        path:"report/:id",
                        element: <ReportPage/>
                    },
                    {
                        path:"report/:id/assign",
                        element: <AssignReportsPage/>
                    },
                    {
                        path:"predictions",
                        element: <PredictionsPage/>
                    },
                    {
                        path:"admin/users",
                        element: <ManageUsers/>
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