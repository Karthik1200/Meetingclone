package com.meetclone.service;

import com.meetclone.entity.Meeting;
import com.meetclone.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class MeetingService {

    @Autowired
    private MeetingRepository repo;

    public Meeting createMeeting(String title, String meetingCode, Long hostUserId) {
        Meeting meeting = new Meeting();
        meeting.setTitle(title);
        meeting.setMeetingCode(meetingCode);
        meeting.setHostUserId(hostUserId);
        return repo.save(meeting);
    }

    public Optional<Meeting> getMeetingByCode(String meetingCode) {
        return repo.findByMeetingCode(meetingCode);
    }

    public Meeting saveMeeting(Meeting meeting) {
        return repo.save(meeting);
    }

    public Optional<Meeting> getMeetingById(Long id) {
        return repo.findById(id);
    }

    public void endMeeting(Long id) {
        Optional<Meeting> meeting = repo.findById(id);
        if (meeting.isPresent()) {
            Meeting m = meeting.get();
            m.setIsActive(false);
            repo.save(m);
        }
    }
}
