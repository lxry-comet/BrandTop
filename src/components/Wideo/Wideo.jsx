import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import css from './Wideo.module.css'
import VideoGrid from './VideoGrid.jsx'
import VideoDetail from './VideoDetail.jsx'
import videosData from '@/json/videos.json'
import productsData from '@/json/products.json'

export class Wideo extends Component {
	state = {
		videos: videosData,
		selectedVideo: null
	}

	handleVideoClick = (video) => {
		this.setState({ selectedVideo: video })
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	handleBackToGrid = () => {
		this.setState({ selectedVideo: null })
	}

	render() {
		const { videos, selectedVideo } = this.state

		if (selectedVideo) {
			const relatedProduct = productsData.find(
				(p) => p.relatedVideoId === selectedVideo.id
			)

			return (
				<div className={css.content}>
					<div className={css.page_header}>
						<Link to="/" className={css.back_btn}>
							← Strona główna
						</Link>
						<button className={css.back_btn} onClick={this.handleBackToGrid}>
							← Powrót do galerii
						</button>
						<div className={css.header_placeholder}></div>
					</div>

					<VideoDetail video={selectedVideo} relatedProduct={relatedProduct} />
				</div>
			)
		}

		return (
			<div className={css.content}>
				<div className={css.page_header}>
					<Link to="/" className={css.back_btn}>
						← Strona główna
					</Link>
					<h2 className={css.section_title}>Galeria wideo</h2>
					<div className={css.header_placeholder}></div>
				</div>

				<VideoGrid videos={videos} onVideoClick={this.handleVideoClick} />
			</div>
		)
	}
}

export default Wideo
