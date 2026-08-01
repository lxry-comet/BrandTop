import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import css from './Wideo.module.css'
import VideoGrid from './VideoGrid.jsx'
import videosData from '@/json/videos.json'

export class Wideo extends Component {
	state = {
		videos: videosData
	}

	handleVideoClick = (video) => {
		window.open(video.url, '_blank', 'noopener,noreferrer')
	}

	render() {
		const { videos } = this.state

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
