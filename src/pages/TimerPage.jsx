import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../stores/useTripStore.js';
import useTimerStore from '../stores/useTimerStore.js';
import { getTrainInfo } from '../utils/getTrainInfo.js';
import { stationList } from '../utils/stationList.js';
import { formatDurationTime, getTotalTime, getTotalTimeSeconds, getArriveTime } from '../utils/time.js';
import Modal from '../components/Modal.jsx';
import ProgressBarModule from '@ramonak/react-progress-bar';
const ProgressBar = ProgressBarModule.default ?? ProgressBarModule;

import endIcon from '../assets/end-icon.svg';
import pauseIcon from '../assets/pause-icon.svg';
import playIcon from '../assets/play-icon.svg';
import resetIcon from '../assets/reset-icon.svg';

function TimerPage() {
    // ---- 선택 상태 ----
    const { train, selected, isToggleOn, focusTime, departure, modal, setModal } = useTripStore();
    const {
        elapsed,
        setElapsed,
        resultPercent,
        setResultPercent,
        timerState,
        setTimerState,
        isResting,
        setIsResting,
        setRestSeconds,
        restTime,
        restOff,
        setRestOff,
    } = useTimerStore();
    const { selectedStation, restCount, trainLabel } = getTrainInfo(train, selected, stationList);

    //전체시간
    const totalTime = getTotalTime(focusTime, restCount, restTime, isToggleOn, restOff);
    //전체목표시간
    const totalTimeSeconds = getTotalTimeSeconds(focusTime, restCount, restTime, isToggleOn, restOff);
    // 도착 시간
    const arriveTime = getArriveTime(totalTime);

    const navigate = useNavigate();

    // 중간 정차 시간 관리
    const [currentIndex, setCurrentIndex] = useState(0);
    // 중간 정차역 리스트 관리
    const [showStationList, setShowStationList] = useState(false);

    // pomodoro-main
    const triggeredStopsRef = useRef(new Set());

    // 타이머 경과시간 표시 (전체 - 남은 시간)
    const [remainingTime, setRemainingTime] = useState(totalTimeSeconds);
    // 사용하지 않은 휴식시간만 남은 시간에서 제외
    const prevRestOff = useRef(0);
    // 경과 시간 계산식
    const currentElapsed = totalTimeSeconds - (remainingTime - (restOff - prevRestOff.current));

    const handleTimerStart = () => {
        setIsResting(false); // 휴식 상태 진입
        setTimerState(true);
    };
    const handleTimerStop = () => {
        setTimerState(false);
    };
    const handleTimerReset = () => {
        setRestOff(0); // 휴식 시간을 처음 상태로 되돌림
        prevRestOff.current = 0; // 이전 휴식시간 기록을 처음 상태로 되돌림

        const resetTotalTime = getTotalTimeSeconds(focusTime, restCount, restTime, isToggleOn);

        setRemainingTime(resetTotalTime);
        // 즉시시작
        handleTimerStart();
        // 중간정차 list 초기화
        setCurrentIndex(0);
        // 중간정차 모달 초기화
        triggeredStopsRef.current.clear();
    };
    // 재생 - 일시정지 토글 버튼
    const handleTimerToggle = () => {
        if (timerState) {
            handleTimerStop();
        } else {
            handleTimerStart();
        }
    };
    // 모달 열기
    const handleModalOpen = () => {
        setElapsed(currentElapsed); // 경과 시간 계산식을 공통상태에 전달
        setTimerState(false); //타이머 정지
        setModal('end'); // 모달 열기
    };

    useEffect(() => {
        const restOffDiff = restOff - prevRestOff.current;

        if (restOffDiff <= 0) {
            prevRestOff.current = restOff;
            return;
        }

        setRemainingTime((prev) => Math.max(prev - restOffDiff, 0));

        prevRestOff.current = restOff;
    }, [restOff]);

    // 타이머 종류 후 결과 페이지로 이동
    useEffect(() => {
        if (remainingTime !== 0) return;

        setTimerState(false);
        setElapsed(elapsed);
        setResultPercent(100);

        // 100%까지 완전히 도달하는게 보인 후 다음 페이지로 이동
        const timer = setTimeout(() => {
            navigate('/result');
        }, 500);

        return () => clearTimeout(timer);
    }, [remainingTime, elapsed, navigate, setElapsed, setResultPercent, setTimerState]);

    // 1초가 지날 때 마다 남은 시간 1초씩 감소
    useEffect(() => {
        if (!timerState || isResting) return;

        const countdown = setInterval(() => {
            setRemainingTime((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearInterval(countdown);
    }, [timerState, isResting]);

    // 중간 정차 - 집중시간이 20분 마다 도달하면 중간 정차 처리
    useEffect(() => {
        if (!timerState || isResting) return;

        const currentElapsed = totalTimeSeconds - remainingTime;
        const stopUnit = Math.floor(currentElapsed / 5);
        // 집중 구간 시간 설정: 10분 설정시 10분 후 중간정차모달 열림
        const isStopTime = currentElapsed > 0 && currentElapsed % (20 * 60) === 0;
        const alreadyTriggered = triggeredStopsRef.current.has(stopUnit);

        if (isToggleOn && isStopTime && !alreadyTriggered && currentIndex < restCount) {
            triggeredStopsRef.current.add(stopUnit);

            setTimerState(false);
            setIsResting(true);
            setRestSeconds(restTime);
            setModal('rest');
            setCurrentIndex((prev) => prev + 1);
        }
    }, [remainingTime, totalTimeSeconds, timerState, isResting, isToggleOn, currentIndex, restCount]);

    return (
        <div className="pomodoro">
            {/* 타이머가 보여지는 부분: Pomodoro-main */}
            <div className="pomodoro-main">
                <div className="pomodoro-wrap">
                    <div className="pomodoroMain item">
                        <div className="pomodoroMainText">
                            <p>
                                {departure} → {selectedStation?.city} · {trainLabel}
                            </p>

                            <p className="percent">{resultPercent}%</p>
                        </div>

                        <div className="pomodoroTimer">
                            <div className="pomodoroTimerText">
                                <div className="pomodoroTimes">
                                    <div className="timer-main">
                                        <div className="elapsed-timer">{formatDurationTime(currentElapsed)}</div>
                                        <p className="arrive">도착 {arriveTime}</p>
                                    </div>

                                    <ProgressTimer
                                        totalTime={totalTimeSeconds}
                                        remainingTime={remainingTime - (restOff - prevRestOff.current)}
                                        setResultPercent={setResultPercent}
                                        departure={departure}
                                        selectedStation={selectedStation}
                                    />

                                    <div className="remaining">
                                        <h4>남은시간</h4>
                                        <div className="remaining-time">
                                            {formatDurationTime(remainingTime - (restOff - prevRestOff.current))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isToggleOn && restCount > 0 && (
                            <div className="pomodoroStation">
                                <div className="station-text" onClick={() => setShowStationList((prev) => !prev)}>
                                    <p>{isToggleOn ? `전체 여정 보기` : null}</p>
                                    <img
                                        src="src/assets/arrow.svg"
                                        className={showStationList ? 'arrow' : 'arrow-up'}
                                        alt="화살표 아이콘"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {isToggleOn && showStationList && <StationList restCount={restCount} currentIndex={currentIndex} />}

                    <div className="button-group">
                        <button
                            className={`control-button ${timerState ? 'pause' : 'play'}`}
                            onClick={handleTimerToggle}>
                            {timerState ? (
                                <>
                                    <span>
                                        <img className="pause-icon" src={pauseIcon} alt="일시정지 아이콘" />
                                    </span>
                                    정지
                                </>
                            ) : (
                                <>
                                    <span>
                                        <img className="play-icon" src={playIcon} alt="재생 아이콘" />
                                    </span>
                                    재생
                                </>
                            )}
                        </button>

                        <button className="control-button reset" onClick={handleTimerReset}>
                            <span>
                                <img className="reset-icon" src={resetIcon} alt="리셋 아이콘" />
                            </span>
                            다시
                        </button>
                        <button className="control-button end" onClick={handleModalOpen}>
                            <span>
                                <img src={endIcon} alt="종료 아이콘" />
                            </span>
                            종료
                        </button>
                    </div>
                </div>
            </div>

            {(modal === 'rest' || modal === 'end') && <Modal />}
        </div>
    );
}

// 소요시간과 progress연결
function ProgressTimer({ totalTime, remainingTime, setResultPercent, departure, selectedStation }) {
    const progress = ((totalTime - remainingTime) / totalTime) * 100;
    const percent = Math.min(Math.max(progress, 0), 100);
    const percentResult = Math.floor(percent);
    const isMobile = window.innerWidth <= 480;

    useEffect(() => {
        setResultPercent(percentResult);
    }, [percentResult, setResultPercent]);

    return (
        <div className="progress-bar">
            <div className="station-wrap">
                <div>{departure}</div>
                <div>{selectedStation?.city}</div>
            </div>
            <div className="progress-track">
                <div className="train" style={{ left: `${percent}%`, transition: 'left 1s linear' }}>
                    🚂
                </div>
            </div>
            <ProgressBar
                className="progress"
                completed={percent}
                height={isMobile ? '14px' : '20px'}
                width="100%"
                isLabelVisible={false}
                baseBgColor="#E7E7EC" // 배경색
                bgColor="#4B3FE0" // 진행바 색상
                animateOnRender={false}
                transitionDuration="1s"
                transitionTimingFunction="linear"
            />
        </div>
    );
}

// 중간 정차 목록
function StationList({ restCount, currentIndex }) {
    // 남은 높이를 계산하여 .station-list 높이로 지정 (브라우저 전체 기준)
    const containerHeight = document.querySelector('.container')?.offsetHeight ?? 0;
    const pomodoroHeight = document.querySelector('.pomodoroMain')?.offsetHeight ?? 0;

    const maxStationHeight = window.innerHeight - containerHeight - pomodoroHeight;

    return (
        <>
            {/* 정차역 갯수에 따라 list 갯수 나오도록 */}
            <div className="station-list item" style={{ maxHeight: maxStationHeight }}>
                <ul>
                    {Array.from({ length: restCount }).map((_, index) => {
                        let status;

                        if (index < currentIndex) {
                            status = '완료 · 20분';
                        } else if (index === currentIndex) {
                            status = '진행중';
                        } else {
                            status = '예정';
                        }

                        return (
                            <li
                                key={index}
                                className={
                                    index < currentIndex ? 'passed' : index === currentIndex ? 'current' : 'coming'
                                }>
                                <div className="station-title">
                                    <span></span>
                                    <h5>정차{index + 1}</h5>
                                </div>

                                <p>{status}</p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}

export default TimerPage;
