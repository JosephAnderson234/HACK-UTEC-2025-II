import { useState, useEffect } from "react";
import { NavegationPaginated } from "@/components/Navegation";
import { getReports } from "@/services/report/getReports";
import type { GetReportsResponse } from "@/interfaces/api";
import { SearchBar } from '../components/Navegation';
import { ReportCard } from "@/components/cards/ReportCards";


export default function AllReportsPage (){

    const [page, setPage] = useState(0);
    const size = 10;
    const [term, setTerm] = useState<string>("");
    const [currentData, setCurrentData] = useState<GetReportsResponse>();

    const handleNextPage = () => {
        if (currentData?.pagination.has_next) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentData?.pagination.has_previous && page > 0) {
            setPage((prevPage) => prevPage - 1);
        }
    };

    const custemSetTerm: React.Dispatch<React.SetStateAction<string>> = (newTerm) => {
        setTerm(newTerm);
        setPage(0); // Reset to first page on new search term
    }


    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await getReports(term, page, size);
                setCurrentData(data);
                console.log(data);
            } catch (error) {
                console.error("Error fetching reports:", error);
            }
        };

        fetchReports();
    }, [page, term]);

    return(
        <div>

            <SearchBar term={term} setTerm={custemSetTerm} />        


            <div>
                {currentData?.reports.map((report) => (
                    <ReportCard key={report.id_reporte} data={report} />
                ))}
            </div>

            {currentData?.pagination && (
                <NavegationPaginated pagination={currentData.pagination} onNext={handleNextPage} onPrevious={handlePreviousPage} />
            )}

        </div>
    )
}