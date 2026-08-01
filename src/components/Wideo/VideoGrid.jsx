import React, { Component } from 'react'
import css from './Wideo.module.css'
import VideoCard from './VideoCard.jsx'

export class VideoGrid extends Component {
	render() {
		const { videos, onVideoClick } = this.props

		if (!videos || videos.length === 0) {
			return <p className={css.empty_text}>Nic nie znaleziono</p>
		}

		return (
			<div className={css.video_grid}>
				{videos.map((video) => (
					<VideoCard key={video.id} video={video} onClick={onVideoClick} />
				))}
			</div>
		)
	}
}

export default VideoGrid
