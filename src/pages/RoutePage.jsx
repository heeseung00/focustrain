import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../stores/useTripStore.js';
import useTimerStore from '../stores/useTimerStore.js';
import { getTrainInfo } from '../utils/getTrainInfo.js';
import { formatTime, getTotalTime, getArriveTime } from '../utils/time.js';
import { stationList } from '../utils/stationList.js';
import Modal from '../components/Modal.jsx';
import { motion } from 'framer-motion';

// 열차, 출발역, 도착역, 시간 선택
function RoutePage() {
    // ---- 선택 상태 ----
    const {
        train,
        setTrain,
        selected,
        setSelected,
        isToggleOn,
        setIsToggleOn,
        focusTime,
        setFocusTime,
        departure,
        seats,
        setActiveCoach,
        setSelectedSeat,
        modal,
        setModal,
    } = useTripStore();
    const { restSeconds } = useTimerStore();
    const { trainKey, selectedStation, travelTime, restCount } = getTrainInfo(train, selected, stationList);
    //전체시간
    const totalTime = getTotalTime(focusTime, restCount, restSeconds, isToggleOn);
    // 도착시간
    const arriveTime = getArriveTime(totalTime);

    // 드롭다운
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);
    const sheetRef = useRef(null);

    useOnClickOutside(sheetRef, selectRef, () => setIsOpen(false));

    // 선택한 열차에 따라 선택 가능한 역 필터링(조건부 랜더링)
    const filterStation = stationList.filter((item) => {
        return item.times[trainKey] !== null;
    });

    // 다음 페이지 이동
    const navigate = useNavigate();
    const navigateGoToSeat = () => {
        navigate('/seat');
    };

    //  ---- 이벤트 핸들러 ----
    const handleTrainChange = (trainType) => {
        setTrain(trainType);
        setSelected('선택');
    };
    const handleSelect = (city) => {
        setSelected(city);
        setIsOpen(false);
    };

    // 모달 열기
    const handleModalOpen = () => {
        setModal('arrival');
    };

    // 도착지(역)이 선택되지 않으면 다음 페이지로 이동할 수 없게 처리
    const handleNextPage = (navigate) => {
        if (!selectedStation) {
            handleModalOpen();
            return;
        }

        navigate();
    };

    // 랜덤 좌석 배치
    function handleRandomSeat() {
        const coachIds = Object.keys(seats);
        const randomSeat = coachIds[Math.floor(Math.random() * coachIds.length)];

        const rows = Object.entries(seats[randomSeat]);
        const randomIndex = Math.floor(Math.random() * rows.length);

        const [row] = rows[randomIndex];

        // 좌석 위치 중 랜덤
        const seatTypes = ['LeftSeat1', 'LeftSeat2', 'RightSeat1', 'RightSeat2'];

        const randomSeatType = seatTypes[Math.floor(Math.random() * seatTypes.length)];

        // SeatGrid에서 쓰는 좌석 번호 계산
        const seatNumber = rows.length - randomIndex;

        const seatLetters = {
            LeftSeat1: 'A',
            LeftSeat2: 'B',
            RightSeat1: 'C',
            RightSeat2: 'D',
        };

        const seatName = `${seatNumber}${seatLetters[randomSeatType]}`;

        // 기존에 사용하던 선택 함수 그대로 사용
        setActiveCoach(Number(randomSeat));

        setSelectedSeat({
            row,
            seatType: randomSeatType,
            seatNumber: seatName,
        });

        navigate('/ticket');
    }

    //  목표 시간(focusTime) 조정시 소요시간(travelTime)과 동기화
    useEffect(() => {
        setFocusTime(travelTime);
    }, [travelTime]);

    return (
        <main>
            <form onSubmit={(e) => e.preventDefault()}>
                <>
                    <div className="content">
                        {/* 기차 종류 선택 */}
                        <div className="train-select">
                            <ul>
                                {['KTX', 'ITX', '무궁화'].map((type) => {
                                    return (
                                        <li key={type}>
                                            <button
                                                className="option"
                                                type="button"
                                                role="radio"
                                                aria-checked={train === type}
                                                onClick={() => handleTrainChange(type)}>
                                                {type}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <ul className="card">
                            <li className="item item-1">
                                {/* 출발, 도착 선택 */}
                                <div className="station">
                                    <div className="title">
                                        <h4>출발</h4>
                                        <div className="select-station disabled">
                                            <h1>{departure}</h1>
                                        </div>
                                    </div>
                                    {/* <button type="button">⇔</button> */}
                                    <div className="title">
                                        <h4>도착</h4>
                                        <div
                                            className={`select-station ${isOpen ? 'station-active' : ''}`}
                                            onClick={() => setIsOpen((prev) => !prev)}
                                            onChange={handleSelect}>
                                            <h1>{selected}</h1>

                                            <div ref={selectRef} className="station-scroll">
                                                {isOpen && (
                                                    <StationMenu
                                                        filterStation={filterStation}
                                                        selected={selected}
                                                        handleSelect={handleSelect}
                                                        trainKey={trainKey}
                                                        setIsOpen={setIsOpen}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <BottomSheet
                                    departure={departure}
                                    isOpen={isOpen}
                                    setIsOpen={setIsOpen}
                                    sheetRef={sheetRef}
                                    filterStation={filterStation}
                                    selected={selected}
                                    handleSelect={handleSelect}
                                    trainKey={trainKey}
                                />

                                <hr />

                                {/* 소요시간에 따른 중간정차역 휴식 시간 지정*/}
                                {/* 도착지까지 정보 표시 */}
                                <div className="time-info">
                                    <div className="info duration">
                                        <h4>소요시간</h4>
                                        {/* 선택된 역이 있으면 매핑된 시간값 바로 출력 */}
                                        <h3>{selectedStation ? formatTime(totalTime) : ''}</h3>
                                    </div>
                                    <div className="info eta">
                                        <h4>도착 예정</h4>
                                        <h3 className="accent">{selectedStation ? arriveTime : ''}</h3>
                                    </div>
                                </div>
                            </li>

                            {/* 중간정차역 체크 */}
                            <li className="item">
                                <div className="stop">
                                    <div className="stop-text">
                                        <h3>중간 정차역(휴식)</h3>
                                        <p>잠시 쉬어가며 집중력을 유지해요.</p>
                                    </div>
                                    <div className="toggle-wrap">
                                        <div
                                            className={`toggle ${isToggleOn ? 'toggle-on' : ''}`}
                                            onClick={() => {
                                                setIsToggleOn(!isToggleOn);
                                            }}>
                                            <div className="toggle-button"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* 토글 ON일 때만 휴식 정보 표시 */}
                                <ToggleShow
                                    isToggleOn={isToggleOn}
                                    selectedStation={selectedStation}
                                    restCount={restCount}
                                />
                            </li>

                            <li className="item">
                                {/* 시간 조정 */}
                                <TimeControl
                                    focusTime={focusTime}
                                    setFocusTime={setFocusTime}
                                    travelTime={travelTime}
                                    selectedStation={selectedStation}
                                    totalTime={totalTime}
                                />
                            </li>
                        </ul>

                        {/* 다음 페이지 이동 */}
                        <div className="button-group">
                            <button type="submit" onClick={() => handleNextPage(navigateGoToSeat)}>
                                좌석 선택
                            </button>
                            <button className="accent" type="submit" onClick={() => handleNextPage(handleRandomSeat)}>
                                바로 예매
                            </button>
                        </div>
                    </div>
                </>
            </form>

            {(modal === 'departure' || modal === 'arrival') && <Modal />}
        </main>
    );
}

// 토글시 보여줄 내용
function ToggleShow({ isToggleOn, selectedStation, restCount }) {
    if (!isToggleOn) {
        return (
            <div className="toggle-show">
                <p>중간 정차 없이 이동해요</p>
            </div>
        );
    }

    if (!selectedStation) {
        return (
            <div className="toggle-show">
                <p>도착지를 선택하면 표시돼요</p>
            </div>
        );
    }
    return (
        <div className="toggle-show">
            <p>예상정차 {restCount}회 · 회당 10분</p>
        </div>
    );
}

// 시간 조정
function TimeControl({ focusTime, setFocusTime, selectedStation, totalTime }) {
    const increase = () => {
        // 역 선택 전에는 미작동
        if (!selectedStation) {
            return;
        }

        // 숫자가 아닌 문자열로 더해지는 오류 방지(ex) '90+5 = 905'이런 덧셈 오류를 '90+5 = 95'가 되도록)
        setFocusTime(focusTime + 5);
    };

    const decrease = () => {
        // 역 선택 전에는 미작동, 10분 이하로는 감소X
        if (!selectedStation || focusTime <= 10) {
            return;
        }

        setFocusTime(focusTime - 5);
    };
    return (
        <div className="time-control">
            <h4>목표 시간</h4>
            <div className="time-adjust">
                <button type="button" onClick={decrease}>
                    -
                </button>
                <h3>{formatTime(totalTime)}</h3>
                <button type="button" onClick={increase}>
                    +
                </button>
            </div>
        </div>
    );
}

// 외부 클릭 감지
function useOnClickOutside(ref1, ref2, handler) {
    const handleRef = useRef(handler);

    useEffect(() => {
        handleRef.current = handler;
    });

    useEffect(() => {
        const onPointerDown = (e) => {
            const isInside = ref1.current?.contains(e.target) || ref2.current?.contains(e.target);

            // 외부클릭(내부를 클릭하지 않았을때)
            if (!isInside) {
                handleRef.current(e);
            }
        };

        document.addEventListener('pointerdown', onPointerDown, { passive: true });
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ref1, ref2]);
}

// 역 선택
function StationMenu({ filterStation, selected, handleSelect, trainKey, setIsOpen }) {
    return (
        <>
            <div className="station-scroll">
                <ul className="station-menu">
                    {filterStation.map((item) => {
                        return (
                            <li key={item.id}>
                                <div
                                    className={`station-city ${selected === item.city ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(item.city);
                                        setIsOpen(false);
                                    }}>
                                    <div className="station-title">{item.city}</div>
                                    <div>{formatTime(item.times[trainKey])}</div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}

function BottomSheet({ departure, isOpen, setIsOpen, sheetRef, filterStation, selected, handleSelect, trainKey }) {
    // 바텀시트 높이
    const [sheetHeight, setSheetHeight] = useState(60);

    // 드래그 시작 위치
    const startYRef = useRef(0);

    // 드래그 시작 당시 높이
    const startHeightRef = useRef(60);

    // 최소 / 최대 높이
    const minHeight = 0;
    const maxHeight = 100;

    // 높이 제한
    const clamp = (value) => {
        return Math.min(Math.max(value, minHeight), maxHeight);
    };

    // 드래그 시작
    const handlePointerDown = (e) => {
        startYRef.current = e.clientY;
        startHeightRef.current = sheetHeight;

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    // 드래그 중
    const handlePointerMove = (e) => {
        // 마우스 또는 터치가 몇 px 움직였는지
        const delta = startYRef.current - e.clientY;

        // 위로 끌면 +, 아래로 끌면 -
        const newHeight = startHeightRef.current + (delta / window.innerHeight) * 100;

        setSheetHeight(clamp(newHeight));
    };

    // 드래그 종료
    const handlePointerUp = (e) => {
        const delta = e.clientY - startYRef.current;
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);

        // 100vh(전체 높이)에서 50vh(중간 이하) 이하로 드래그하면 닫힘
        if (startHeightRef.current === maxHeight) {
            const closeDistance = ((maxHeight - 50) / 100) * window.innerHeight;
            // 현재 드래그 위치와 닫으려는 위치를 비교 후 닫힘 기준 50% 이상이면 닫기
            if (delta >= closeDistance) {
                setIsOpen(false);
                setSheetHeight(60);
                return;
            }
        }

        // 60vh(중간높이)에서 아래로 200px 이상 드래그하면 닫힘
        if (startHeightRef.current === 60 && delta > 100) {
            setIsOpen(false);
            setSheetHeight(60);
            return;
        }

        // 위로 100px 이상 드래그 하면 100vh(전체 높이)까지 올리기
        if (delta < -50) {
            setSheetHeight(maxHeight);
            return;
        }

        // 100vh(전체 높이)에서 아래로 드래그하면  60vh(중간높이)로 내리기
        if (startHeightRef.current === maxHeight && delta > 0) {
            setSheetHeight(60);
            return;
        }

        // 시작했던 초기 높이로 복귀
        setSheetHeight(startHeightRef.current);
    };

    // 컴포넌트 제거 시 이벤트 정리
    useEffect(() => {
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    return (
        <>
            {isOpen && (
                <div className="layer">
                    <div className="dim"></div>

                    <motion.div
                        className="bottom-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.25 }}
                        ref={sheetRef}
                        style={{
                            height: `${sheetHeight}vh
                        `,
                        }}>
                        <motion.div className="handle-drag" onPointerDown={handlePointerDown}>
                            <div></div>
                        </motion.div>

                        <div className="bottom-content">
                            <div className="title">
                                <h3>도착지 선택</h3>
                                <h4>{departure}에서 출발하는 노선</h4>
                            </div>

                            <hr />

                            <StationMenu
                                filterStation={filterStation}
                                selected={selected}
                                handleSelect={handleSelect}
                                trainKey={trainKey}
                                setIsOpen={setIsOpen}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

export default RoutePage;
