require 'xcodeproj'

project_path = 'App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the App target
target = project.targets.find { |t| t.name == 'App' }

# Find the App group
app_group = project.main_group.find_subpath('App', false)

# Add file reference to the group
file_path = 'App/chuong.mp3'
file_ref = app_group.new_file(file_path)

# Add the file reference to the target's resources build phase
resources_build_phase = target.resources_build_phase
resources_build_phase.add_file_reference(file_ref)

project.save
puts "Successfully added chuong.mp3 to Xcode project!"
