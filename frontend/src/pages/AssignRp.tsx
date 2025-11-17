import { useParams } from "react-router";

export default function AssignReportsPage(){
    const {id} = useParams();

    return (
        <div>AssignReportsPage {id}</div>
    )
}