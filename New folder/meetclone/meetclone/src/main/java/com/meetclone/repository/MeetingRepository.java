package com.meetclone.repository;

import com.meetclone.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    Optional<Meeting> findByMeetingCode(String meetingCode);
    Optional<Meeting> findByIdAndHostUserId(Long id, Long hostUserId);
}
