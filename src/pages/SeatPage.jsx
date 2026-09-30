import { useNavigate } from 'react-router-dom';
import useTripStore from '../stores/useTripStore.js';
import SeatGrid from '../components/SeatGrid.jsx';
import '../styles/SeatPage.css';

const SeatPage = () => {
    const { seats, activeCoach, setActiveCoach, selectedSeat, setSelectedSeat } = useTripStore();

    // 기차 호차 선택
    const handleCoachClick = (coachId) => {
        // 항상 표시
        setActiveCoach(Number(coachId));
        setSelectedSeat(null);
    };

    // 기차 좌석 선택
    const handleSeatClick = (row, seatType, seatNumber) => {
        if (selectedSeat?.row === row && selectedSeat?.seatType === seatType) {
            setSelectedSeat(null);
            return;
        }
        setSelectedSeat({ row, seatType, seatNumber });
    };

    // 다음 페이지 이동
    const navigate = useNavigate();
    const navigateGoToTicket = () => {
        navigate('/ticket');
    };

    return (
        <div className="train-booking">
            <div className="train-container">
                {/* 기차 호차 선택 */}
                <div className="train-display">
                    {Object.keys(seats).map((coachId) => (
                        <button
                            key={coachId}
                            className={`coach-button ${activeCoach === Number(coachId) ? 'active' : ''}`}
                            onClick={() => handleCoachClick(coachId)}>
                            {coachId}호차
                        </button>
                    ))}
                </div>
            </div>

            <div className="coach-select">
                {/* 기차 좌석 선택 */}
                {activeCoach && (
                    <SeatGrid
                        seats={seats}
                        activeCoach={activeCoach}
                        selectedSeat={selectedSeat}
                        handleSeatClick={handleSeatClick}
                    />
                )}

                {/* 예매 버튼 - 좌석 선택시 버튼 활성화되어 다음 페이지로 이동가능 */}
                <div className="button-group">
                    <button
                        className={`reservation-btn ${selectedSeat ? 'accent' : 'disable '}`}
                        onClick={navigateGoToTicket}
                        disabled={!selectedSeat}>
                        예매하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeatPage;
