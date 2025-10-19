"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import Tarot from "./tarot"
import BirthChart from "./birth-chart"
import "swiper/css"

export default function Home() {
    return (
        <div className='w-full h-screen'>
            <Swiper className='w-full h-screen'>
                <SwiperSlide className='w-full h-screen'>
                    <div className='w-full h-full flex flex-col items-center justify-center'>
                        <Tarot />
                    </div>
                </SwiperSlide>
                <SwiperSlide className='w-full h-full'>
                    <div className='w-full h-full flex flex-col items-center justify-center'>
                        <BirthChart />
                    </div>
                </SwiperSlide>
            </Swiper>
        </div>
    )
}
